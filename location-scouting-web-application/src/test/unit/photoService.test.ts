import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deletePhotos, storePhotos, withPhotoUrls } from '@/services/photoService'
import { ErrorCode, fail } from '@/schemas/result'
import { PhotoUploadInput } from '@/schemas/photoUploadInput'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { FAKE_STORAGE_URL, FakeObjectStore } from '@/test/helpers/fakeObjectStore'

const photo = (filename: string, contents = filename): PhotoUploadInput => ({
    buffer: Buffer.from(contents),
    filename,
    mimeType: 'image/jpeg',
})

describe('photoService', () => {
    let objectStore: FakeObjectStore

    beforeEach(() => {
        objectStore = new FakeObjectStore()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
    })

    describe('storePhotos', () => {
        it('should store each photo with its content type and return one key per photo, in order', async () => {
            // Act
            const keys = expectSuccess(await storePhotos([photo('front.jpg'), photo('back.jpg')], { objectStore }))

            // Assert
            expect(keys).toHaveLength(2)
            expect(objectStore.objects.get(keys[0])?.body.toString()).toBe('front.jpg')
            expect(objectStore.objects.get(keys[1])?.body.toString()).toBe('back.jpg')
            expect(objectStore.objects.get(keys[0])?.contentType).toBe('image/jpeg')
        })

        it('should give every upload a fresh key, even for the same file name', async () => {
            // Act
            const keys = expectSuccess(await storePhotos([photo('same.jpg'), photo('same.jpg')], { objectStore }))

            // Assert
            expect(new Set(keys).size).toBe(2)
        })

        it('should keep a safe file extension but none of the user-supplied file name', async () => {
            // Act
            const [plain, traversal, hostileExtension, none] = expectSuccess(await storePhotos([
                photo('Back Alley.JPG'),
                photo('../../etc/passwd?x=1#.png'),
                photo('photo.<script>'),
                photo('README'),
            ], { objectStore }))

            // Assert
            expect(plain).toMatch(/^photos\/[0-9a-f-]{36}\.jpg$/)
            expect(traversal).toMatch(/^photos\/[0-9a-f-]{36}\.png$/)
            expect(hostileExtension).toMatch(/^photos\/[0-9a-f-]{36}$/)
            expect(none).toMatch(/^photos\/[0-9a-f-]{36}$/)
        })

        it('should mark stored photos as cacheable for good, since a key is never reused', async () => {
            // Act
            const [key] = expectSuccess(await storePhotos([photo('front.jpg')], { objectStore }))

            // Assert
            expect(objectStore.objects.get(key)?.cacheControl).toBe('private, max-age=31536000, immutable')
        })

        it('should remove the photos that did upload when another one fails', async () => {
            // Arrange
            const put = objectStore.put.bind(objectStore)
            vi.spyOn(objectStore, 'put').mockImplementation(async (key, body, options) =>
                body.toString() === 'broken' ? fail(ErrorCode.UNAVAILABLE, 'Object storage is unavailable') : put(key, body, options))

            // Act
            const result = expectFailure(await storePhotos([photo('ok.jpg'), photo('bad.jpg', 'broken'), photo('ok2.jpg')], { objectStore }))

            // Assert
            expect(result.code).toBe(ErrorCode.UNAVAILABLE)
            expect(objectStore.objects.size).toBe(0)
        })
    })

    describe('deletePhotos', () => {
        it('should delete every given key', async () => {
            // Arrange
            const keys = expectSuccess(await storePhotos([photo('a.jpg'), photo('b.jpg'), photo('c.jpg')], { objectStore }))

            // Act
            expectSuccess(await deletePhotos(keys.slice(0, 2), { objectStore }))

            // Assert
            expect([...objectStore.objects.keys()]).toEqual([keys[2]])
        })

        it('should report a failed delete', async () => {
            // Arrange
            vi.spyOn(objectStore, 'delete').mockResolvedValue(fail(ErrorCode.UNAVAILABLE, 'Object storage is unavailable'))

            // Act & Assert
            expect(expectFailure(await deletePhotos(['photos/a.jpg'], { objectStore })).code).toBe(ErrorCode.UNAVAILABLE)
        })
    })

    describe('withPhotoUrls', () => {
        const rows = [
            { id: 'p1', name: 'Front', displayOrder: 0, storageKey: 'photos/front.jpg' },
            { id: 'p2', name: 'Back', displayOrder: 1, storageKey: 'photos/back.jpg' },
        ]

        it('should swap each storage key for a presigned URL and its expiry, keeping everything else', async () => {
            // Act
            const photos = expectSuccess(await withPhotoUrls('user-1', rows, { objectStore, ttlSeconds: 900 }))

            // Assert
            expect(photos).toEqual([
                { id: 'p1', name: 'Front', displayOrder: 0, url: `${FAKE_STORAGE_URL}/photos/front.jpg?ttl=900`, urlExpiresAt: expect.any(Date) },
                { id: 'p2', name: 'Back', displayOrder: 1, url: `${FAKE_STORAGE_URL}/photos/back.jpg?ttl=900`, urlExpiresAt: expect.any(Date) },
            ])
        })

        it('should never pass the storage key on to the client', async () => {
            // Act
            const photos = expectSuccess(await withPhotoUrls('user-1', rows, { objectStore, ttlSeconds: 900 }))

            // Assert
            for (const photo of photos) {
                expect(photo).not.toHaveProperty('storageKey')
            }
        })

        it('should use PHOTO_URL_TTL_SECONDS when no TTL is passed, defaulting to an hour', async () => {
            // Arrange
            const presignGet = vi.spyOn(objectStore, 'presignGet')
            vi.stubEnv('PHOTO_URL_TTL_SECONDS', '')

            // Act
            expectSuccess(await withPhotoUrls('user-1', rows.slice(0, 1), { objectStore }))
            vi.stubEnv('PHOTO_URL_TTL_SECONDS', '600')
            expectSuccess(await withPhotoUrls('user-1', rows.slice(0, 1), { objectStore }))

            // Assert
            expect(presignGet.mock.calls.map(([, ttl]) => ttl)).toEqual([3600, 600])
        })

        it('should fail as a whole when any URL cannot be signed', async () => {
            // Arrange
            vi.spyOn(objectStore, 'presignGet')
                .mockResolvedValueOnce({ success: true, data: { url: 'https://storage.test/ok', expiresAt: new Date() } })
                .mockResolvedValueOnce(fail(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to sign a storage URL'))

            // Act
            const result = expectFailure(await withPhotoUrls('user-1', rows, { objectStore }))

            // Assert
            expect(result.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR)
        })

        it('should handle a location without photos', async () => {
            // Act & Assert
            expect(expectSuccess(await withPhotoUrls('user-1', [], { objectStore }))).toEqual([])
        })
    })
})
