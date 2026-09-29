import { describe, expect, it } from 'vitest'
import { deletePhotos, storePhotos, withPhotoUrls } from '@/services/photoService'
import { PhotoUploadInput } from '@/schemas/photoUploadInput'
import { expectSuccess } from '@/test/helpers/result'
import { listTestBucket, testBucket, testStorageUrl } from '@/test/helpers/testBucket'

// Against the Garage test container, through the app's default object store

const fakePhoto = (filename: string, contents: string): PhotoUploadInput => ({
    buffer: Buffer.from(contents),
    filename,
    mimeType: 'image/jpeg',
})

describe('photoService', () => {
    describe('storePhotos', () => {
        it('should upload every photo to the bucket', async () => {
            // Act
            const keys = expectSuccess(await storePhotos([fakePhoto('one.jpg', 'photo 1'), fakePhoto('two.jpg', 'photo 2')]))

            // Assert
            expect(keys).toHaveLength(2)
            expect((await listTestBucket()).sort()).toEqual([...keys].sort())
        })

        it('should not make photos publicly readable', async () => {
            // Arrange
            const [key] = expectSuccess(await storePhotos([fakePhoto('test.jpg', 'fake image data')]))

            // Act
            const response = await fetch(`${testStorageUrl}/${testBucket}/${key}`)

            // Assert
            expect(response.status).toBe(403)
        })
    })

    describe('withPhotoUrls', () => {
        it('should mint a URL that serves the stored photo', async () => {
            // Arrange
            const [storageKey] = expectSuccess(await storePhotos([fakePhoto('test.jpg', 'fake image data')]))

            // Act
            const [photo] = expectSuccess(await withPhotoUrls('user-1', [{ id: 'p1', storageKey }]))
            const response = await fetch(photo.url)

            // Assert
            expect(response.status).toBe(200)
            expect(response.headers.get('content-type')).toBe('image/jpeg')
            expect(response.headers.get('cache-control')).toContain('immutable')
            expect(await response.text()).toBe('fake image data')
            expect(photo.urlExpiresAt.getTime()).toBeGreaterThanOrEqual(Date.now() + 3600 * 1000 - 1000)
        })
    })

    describe('deletePhotos', () => {
        it('should remove photos from the bucket', async () => {
            // Arrange
            const keys = expectSuccess(await storePhotos([fakePhoto('a.jpg', 'a'), fakePhoto('b.jpg', 'b')]))

            // Act
            expectSuccess(await deletePhotos([keys[0]]))

            // Assert
            expect(await listTestBucket()).toEqual([keys[1]])
        })
    })
})
