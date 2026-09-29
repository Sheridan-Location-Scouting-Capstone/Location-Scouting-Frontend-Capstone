import { afterEach, describe, expect, it, vi } from 'vitest'
import { Photo } from '@prisma/client'
import { deletePhotos, storePhotos, withPhotoUrls } from '@/services/photoService'
import { createLocation } from '@/services/locationService'
import { addPhotosToLocation } from '@/services/locationPhotoService'
import { PhotoUploadInput } from '@/schemas/photoUploadInput'
import { ErrorCode } from '@/schemas/result'
import { prisma } from '@/test/setup'
import { signUpSetup } from '@/test/e2e/fixtures'
import { buildLocationInput } from '@/test/helpers/builders'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { FakeObjectStore } from '@/test/helpers/fakeObjectStore'
import { listTestBucket, testBucket, testStorageUrl } from '@/test/helpers/testBucket'

// Against the Garage test container, through the app's default object store

const fakePhoto = (filename: string, contents: string): PhotoUploadInput => ({
    buffer: Buffer.from(contents),
    filename,
    mimeType: 'image/jpeg',
})

/** A signed-up user with one location holding the given photos */
async function userWithPhotos(...contents: string[]) {
    const { userId } = await signUpSetup()
    const location = expectSuccess(await createLocation(userId, buildLocationInput(), { db: prisma }))
    const photos = expectSuccess(await addPhotosToLocation(userId, location.id,
        contents.map((content, index) => fakePhoto(`photo-${index}.jpg`, content)),
        { db: prisma, labelDetector: async () => [] }))
    return { userId, photos }
}

describe('photoService', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
    })

    describe('storePhotos', () => {
        it('should upload every photo under the owner\'s own prefix', async () => {
            // Act
            const keys = expectSuccess(await storePhotos('owner1', [fakePhoto('one.jpg', 'photo 1'), fakePhoto('two.jpg', 'photo 2')]))

            // Assert
            expect(keys).toHaveLength(2)
            for (const key of keys) expect(key.startsWith('users/owner1/photos/')).toBe(true)
            expect((await listTestBucket()).sort()).toEqual([...keys].sort())
        })

        it('should refuse a user id that could reach outside its prefix', async () => {
            // Act
            vi.spyOn(console, 'error').mockImplementation(() => {})
            expectFailure(await storePhotos('../owner1', [fakePhoto('one.jpg', 'photo 1')]))

            // Assert
            expect(await listTestBucket()).toEqual([])
        })
    })

    describe('unauthenticated access', () => {
        it('should refuse an unsigned request for a stored photo', async () => {
            // Arrange
            const [key] = expectSuccess(await storePhotos('owner1', [fakePhoto('test.jpg', 'fake image data')]))

            // Act
            const response = await fetch(`${testStorageUrl}/${testBucket}/${key}`)

            // Assert
            expect(response.status).toBe(403)
        })

        it('should refuse to list the bucket, or a user\'s prefix, without credentials', async () => {
            // Arrange
            expectSuccess(await storePhotos('owner1', [fakePhoto('test.jpg', 'fake image data')]))

            // Act
            const bucket = await fetch(`${testStorageUrl}/${testBucket}`)
            const prefix = await fetch(`${testStorageUrl}/${testBucket}?list-type=2&prefix=users/owner1/`)

            // Assert
            expect(bucket.status).toBe(403)
            expect(prefix.status).toBe(403)
        })
    })

    describe('withPhotoUrls', () => {
        it('should mint a working URL for a photo the user owns', async () => {
            // Arrange
            const owner = await userWithPhotos('owner photo')

            // Act
            const [photo] = expectSuccess(await withPhotoUrls(owner.userId, owner.photos, { db: prisma }))
            const response = await fetch(photo.url)

            // Assert
            expect(response.status).toBe(200)
            expect(response.headers.get('content-type')).toBe('image/jpeg')
            expect(response.headers.get('cache-control')).toContain('immutable')
            expect(await response.text()).toBe('owner photo')
        })

        it('should not let one user get a URL for another user\'s photo', async () => {
            // Arrange
            const owner = await userWithPhotos('owner photo')
            const other = await userWithPhotos('other photo')
            vi.spyOn(console, 'warn').mockImplementation(() => {})

            // Act
            const result = expectFailure(await withPhotoUrls(other.userId, owner.photos, { db: prisma }))

            // Assert - NOT_FOUND rather than FORBIDDEN, so the photo's existence isn't confirmed
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(result).not.toHaveProperty('data')
        })

        it('should mint nothing when a request mixes the user\'s own photos with someone else\'s', async () => {
            // Arrange
            const owner = await userWithPhotos('owner photo')
            const other = await userWithPhotos('other photo')
            const objectStore = new FakeObjectStore()
            const presignGet = vi.spyOn(objectStore, 'presignGet')
            vi.spyOn(console, 'warn').mockImplementation(() => {})

            // Act
            const result = expectFailure(await withPhotoUrls(other.userId, [...other.photos, ...owner.photos], { db: prisma, objectStore }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(presignGet).not.toHaveBeenCalled()
        })

        it('should refuse a photo that doesn\'t exist', async () => {
            // Arrange
            const owner = await userWithPhotos('owner photo')
            vi.spyOn(console, 'warn').mockImplementation(() => {})

            // Act & Assert
            const result = expectFailure(await withPhotoUrls(owner.userId, [{ id: 'no-such-photo' }], { db: prisma }))
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })

        it('should sign the key stored for the photo, never a key supplied by the caller', async () => {
            // Arrange - the owner asks for their own photo, but with someone else's storage key attached
            const owner = await userWithPhotos('owner photo')
            const other = await userWithPhotos('other photo')
            const forged: Photo = { ...owner.photos[0], storageKey: other.photos[0].storageKey }

            // Act
            const [photo] = expectSuccess(await withPhotoUrls(owner.userId, [forged], { db: prisma }))

            // Assert
            expect(new URL(photo.url).pathname).toBe(`/${testBucket}/${owner.photos[0].storageKey}`)
            expect(await (await fetch(photo.url)).text()).toBe('owner photo')
        })

        it('should keep every field but the storage key, and add the URL\'s expiry', async () => {
            // Arrange
            const owner = await userWithPhotos('front', 'back')

            // Act
            const photos = expectSuccess(await withPhotoUrls(owner.userId, owner.photos, { db: prisma }))

            // Assert
            expect(photos.map((photo) => photo.id)).toEqual(owner.photos.map((photo) => photo.id))
            for (const photo of photos) {
                expect(photo).not.toHaveProperty('storageKey')
                expect(photo.name).toBeDefined()
                expect(photo.urlExpiresAt.getTime()).toBeGreaterThanOrEqual(Date.now() + 3600 * 1000 - 1000)
            }
        })

        it('should use PHOTO_URL_TTL_SECONDS when no TTL is passed, defaulting to an hour', async () => {
            // Arrange
            const owner = await userWithPhotos('front')
            const objectStore = new FakeObjectStore()
            const presignGet = vi.spyOn(objectStore, 'presignGet')
            vi.stubEnv('PHOTO_URL_TTL_SECONDS', '')

            // Act
            expectSuccess(await withPhotoUrls(owner.userId, owner.photos, { db: prisma, objectStore }))
            vi.stubEnv('PHOTO_URL_TTL_SECONDS', '600')
            expectSuccess(await withPhotoUrls(owner.userId, owner.photos, { db: prisma, objectStore }))
            expectSuccess(await withPhotoUrls(owner.userId, owner.photos, { db: prisma, objectStore, ttlSeconds: 90 }))

            // Assert
            expect(presignGet.mock.calls.map(([, ttl]) => ttl)).toEqual([3600, 600, 90])
        })

        it('should fail as a whole when any URL cannot be signed', async () => {
            // Arrange
            const owner = await userWithPhotos('front', 'back')
            const objectStore = new FakeObjectStore()
            vi.spyOn(objectStore, 'presignGet')
                .mockResolvedValueOnce({ success: true, data: { url: 'https://storage.test/ok', expiresAt: new Date() } })
                .mockResolvedValueOnce({ success: false, code: ErrorCode.INTERNAL_SERVER_ERROR, error: 'Failed to sign a storage URL' })

            // Act & Assert
            expect(expectFailure(await withPhotoUrls(owner.userId, owner.photos, { db: prisma, objectStore })).code)
                .toBe(ErrorCode.INTERNAL_SERVER_ERROR)
        })

        it('should handle an empty list without touching the database', async () => {
            // Act & Assert
            expect(expectSuccess(await withPhotoUrls('anyone', [], { db: prisma }))).toEqual([])
        })
    })

    describe('deletePhotos', () => {
        it('should remove photos from the bucket', async () => {
            // Arrange
            const keys = expectSuccess(await storePhotos('owner1', [fakePhoto('a.jpg', 'a'), fakePhoto('b.jpg', 'b')]))

            // Act
            expectSuccess(await deletePhotos([keys[0]]))

            // Assert
            expect(await listTestBucket()).toEqual([keys[1]])
        })
    })
})
