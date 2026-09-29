import { describe, expect, it } from 'vitest'
import { createS3ObjectStore } from '@/infrastructure/storage/s3ObjectStore'
import { parseObjectStoreConfig } from '@/infrastructure/storage/config'
import { ErrorCode } from '@/schemas/result'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { testBucket, testStorageUrl } from '@/test/helpers/testBucket'

// Against the Garage test container (src/test/containers.ts)

const config = expectSuccess(parseObjectStoreConfig())
const store = createS3ObjectStore(config)
const jpeg = { contentType: 'image/jpeg' }

async function readAll(body: AsyncIterable<Buffer>) {
    const chunks: Buffer[] = []
    for await (const chunk of body) chunks.push(chunk)
    return Buffer.concat(chunks).toString()
}

describe('S3 object store on Garage', () => {
    it('should store an object and read it back', async () => {
        // Act
        expectSuccess(await store.put('photos/a.jpg', Buffer.from('image bytes'), jpeg))
        const stored = expectSuccess(await store.get('photos/a.jpg'))

        // Assert
        expect(stored.contentType).toBe('image/jpeg')
        expect(stored.contentLength).toBe(11)
        expect(await readAll(stored.body)).toBe('image bytes')
        expect(expectSuccess(await store.exists('photos/a.jpg'))).toBe(true)
    })

    it('should delete an object, and accept deleting it again', async () => {
        // Arrange
        expectSuccess(await store.put('photos/a.jpg', Buffer.from('image bytes'), jpeg))

        // Act
        expectSuccess(await store.delete('photos/a.jpg'))
        expectSuccess(await store.delete('photos/a.jpg'))

        // Assert
        expect(expectSuccess(await store.exists('photos/a.jpg'))).toBe(false)
    })

    it('should report NOT_FOUND when reading a missing object', async () => {
        // Act & Assert
        expect(expectFailure(await store.get('photos/missing.jpg')).code).toBe(ErrorCode.NOT_FOUND)
    })

    it('should keep the bucket private', async () => {
        // Arrange
        expectSuccess(await store.put('photos/a.jpg', Buffer.from('image bytes'), jpeg))

        // Act
        const response = await fetch(`${testStorageUrl}/${testBucket}/photos/a.jpg`)

        // Assert
        expect(response.status).toBe(403)
    })

    it('should serve an object through a presigned URL, with its content type and cache header', async () => {
        // Arrange
        expectSuccess(await store.put('photos/a.jpg', Buffer.from('image bytes'), { ...jpeg, cacheControl: 'private, max-age=60' }))

        // Act
        const { url } = expectSuccess(await store.presignGet('photos/a.jpg', 3600))
        const response = await fetch(url)

        // Assert
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe('image/jpeg')
        expect(response.headers.get('cache-control')).toBe('private, max-age=60')
        expect(await response.text()).toBe('image bytes')
    })

    it('should refuse a presigned URL once it has expired', async () => {
        // Arrange
        expectSuccess(await store.put('photos/a.jpg', Buffer.from('image bytes'), jpeg))
        const { url, expiresAt } = expectSuccess(await store.presignGet('photos/a.jpg', 1))

        // Act
        await new Promise((resolve) => setTimeout(resolve, expiresAt.getTime() - Date.now() + 1100))
        const response = await fetch(url)

        // Assert
        expect(response.ok).toBe(false)
    })

    it('should refuse a presigned URL fetched through a host other than the one it was signed for', async () => {
        // Arrange - the same Garage, reached as 127.0.0.1 instead of localhost
        const publicEndpoint = testStorageUrl.replace('localhost', '127.0.0.1')
        const publicStore = createS3ObjectStore({ ...config, publicEndpoint })
        expectSuccess(await store.put('photos/a.jpg', Buffer.from('image bytes'), jpeg))
        const { url } = expectSuccess(await publicStore.presignGet('photos/a.jpg', 3600))

        // Act
        const viaSignedHost = await fetch(url)
        const viaOtherHost = await fetch(url.replace('127.0.0.1', 'localhost'))

        // Assert
        expect(new URL(url).hostname).toBe('127.0.0.1')
        expect(viaSignedHost.status).toBe(200)
        expect(viaOtherHost.status).toBe(403)
    })

    it('should accept an upload to a presigned URL only with the content type it was signed for', async () => {
        // Arrange
        const { url } = expectSuccess(await store.presignPut('photos/b.png', 'image/png', 300))

        // Act
        const matching = await fetch(url, { method: 'PUT', body: 'png bytes', headers: { 'Content-Type': 'image/png' } })
        const html = await fetch(url, { method: 'PUT', body: '<script>alert(1)</script>', headers: { 'Content-Type': 'text/html' } })

        // Assert
        expect(matching.status).toBe(200)
        expect(html.status).toBe(403)
        const stored = expectSuccess(await store.get('photos/b.png'))
        expect(stored.contentType).toBe('image/png')
        expect(await readAll(stored.body)).toBe('png bytes')
    })
})
