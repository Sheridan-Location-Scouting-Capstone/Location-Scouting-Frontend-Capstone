import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deletePhotos, storePhotos } from '@/services/photoService'
import { ErrorCode, fail } from '@/schemas/result'
import { PhotoUploadInput } from '@/schemas/photoUploadInput'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { FakeObjectStore } from '@/test/helpers/fakeObjectStore'

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
    })

    describe('storePhotos', () => {
        it('should store each photo with its content type and return one key per photo, in order', async () => {
            // Act
            const keys = expectSuccess(await storePhotos('user1', [photo('front.jpg'), photo('back.jpg')], { objectStore }))

            // Assert
            expect(keys).toHaveLength(2)
            expect(objectStore.objects.get(keys[0])?.body.toString()).toBe('front.jpg')
            expect(objectStore.objects.get(keys[1])?.body.toString()).toBe('back.jpg')
            expect(objectStore.objects.get(keys[0])?.contentType).toBe('image/jpeg')
        })

        it('should give every upload a fresh key, even for the same file name', async () => {
            // Act
            const keys = expectSuccess(await storePhotos('user1', [photo('same.jpg'), photo('same.jpg')], { objectStore }))

            // Assert
            expect(new Set(keys).size).toBe(2)
        })

        it('should key each photo under its owner\'s prefix, keeping a safe file extension but none of the file name', async () => {
            // Act
            const [plain, traversal, hostileExtension, none] = expectSuccess(await storePhotos('user1', [
                photo('Back Alley.JPG'),
                photo('../../etc/passwd?x=1#.png'),
                photo('photo.<script>'),
                photo('README'),
            ], { objectStore }))

            // Assert
            expect(plain).toMatch(/^users\/user1\/photos\/[0-9a-f-]{36}\.jpg$/)
            expect(traversal).toMatch(/^users\/user1\/photos\/[0-9a-f-]{36}\.png$/)
            expect(hostileExtension).toMatch(/^users\/user1\/photos\/[0-9a-f-]{36}$/)
            expect(none).toMatch(/^users\/user1\/photos\/[0-9a-f-]{36}$/)
        })

        it('should mark stored photos as cacheable for good, since a key is never reused', async () => {
            // Act
            const [key] = expectSuccess(await storePhotos('user1', [photo('front.jpg')], { objectStore }))

            // Assert
            expect(objectStore.objects.get(key)?.cacheControl).toBe('private, max-age=31536000, immutable')
        })

        it('should remove the photos that did upload when another one fails', async () => {
            // Arrange
            const put = objectStore.put.bind(objectStore)
            vi.spyOn(objectStore, 'put').mockImplementation(async (key, body, options) =>
                body.toString() === 'broken' ? fail(ErrorCode.UNAVAILABLE, 'Object storage is unavailable') : put(key, body, options))

            // Act
            const result = expectFailure(await storePhotos('user1', [photo('ok.jpg'), photo('bad.jpg', 'broken'), photo('ok2.jpg')], { objectStore }))

            // Assert
            expect(result.code).toBe(ErrorCode.UNAVAILABLE)
            expect(objectStore.objects.size).toBe(0)
        })
    })

    describe('deletePhotos', () => {
        it('should delete every given key', async () => {
            // Arrange
            const keys = expectSuccess(await storePhotos('user1', [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')], { objectStore }))

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
})
