import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {uploadPhoto, uploadPhotos, deletePhoto} from '@/app/services/photoService'
import {PhotoUploadInput} from "@/app/schemas/photoUploadInput";

const testBucket = process.env.MINIO_TEST_BUCKET || 'location-photos-test'

const fakePhoto: PhotoUploadInput = {
    buffer: Buffer.from('fake image data'),
    filename: 'test.jpg',
    mimeType: 'image/jpeg'
}

describe('photoService', () => {

    describe('uploadPhoto', () => {
        it('should upload a photo and return a url and key', async () => {
            // Arrange & Act
            const result = await uploadPhoto(fakePhoto, testBucket)

            // Assert
            expect(result.url).toBeDefined()
            expect(result.key).toBeDefined()
            expect(result.url).toContain('test.jpg')
        })

        it('should generate a unique key for each upload', async () => {
            // Act
            const result1 = await uploadPhoto(fakePhoto, testBucket)
            const result2 = await uploadPhoto(fakePhoto, testBucket)

            // Assert
            expect(result1.key).not.toBe(result2.key)
        })

        it('should return a publicly accessible URL', async () => {
            // Arrange & Act
            const result = await uploadPhoto(fakePhoto, testBucket)
            const response = await fetch(result.url)

            // Assert
            expect(response.status).toBe(200)
            const buffer = Buffer.from(await response.arrayBuffer())
            expect(buffer.toString()).toBe('fake image data')
        })
    })

    describe('uploadPhotos', () => {
        it('should upload multiple photos and return results for each', async () => {
            // Arrange
            const photos = [
                { buffer: Buffer.from('photo 1'), filename: 'one.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo 2'), filename: 'two.jpg', mimeType: 'image/jpeg' },
            ]

            // Act
            const results = await uploadPhotos(photos, testBucket)

            // Assert
            expect(results).toHaveLength(2)
            results.forEach(r => {
                expect(r.url).toBeDefined()
                expect(r.key).toBeDefined()
            })
        })
    })

    describe('deletePhoto', () => {
        it('should delete an uploaded photo', async () => {
            // Arrange
            const uploaded = await uploadPhoto(fakePhoto, testBucket)

            // Act & Assert
            await expect(deletePhoto(uploaded.key, testBucket)).resolves.not.toThrow()
        })
    })
})