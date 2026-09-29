import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoSuchKey, NotFound, S3Client, S3ServiceException } from '@aws-sdk/client-s3'
import { createS3ObjectStore, MAX_PRESIGN_SECONDS } from '@/infrastructure/storage/s3ObjectStore'
import type { ObjectStoreConfig } from '@/infrastructure/storage/config'
import { ErrorCode } from '@/schemas/result'
import { expectFailure, expectSuccess } from '@/test/helpers/result'

// Presigning is a local computation, so these tests never reach a storage server. Requests that would are stubbed at
// S3Client.send; the round trips against a real Garage live in the integration tests.

const config: ObjectStoreConfig = {
    endpoint: 'http://garage.internal:3900',
    publicEndpoint: 'https://files.example.test',
    region: 'garage',
    bucket: 'location-photos',
    accessKeyId: 'GKtestaccesskey',
    secretAccessKey: 'test-secret-key-long-enough',
}

const HOUR = 3600
const at = (iso: string) => () => new Date(iso)

function serviceError(name: string, httpStatusCode: number) {
    return new S3ServiceException({ name, $fault: httpStatusCode >= 500 ? 'server' : 'client', $metadata: { httpStatusCode }, message: name })
}

afterEach(() => {
    vi.restoreAllMocks()
})

describe('S3 object store', () => {
    describe('presignGet', () => {
        it('should sign a path-style URL for the public endpoint, not the internal one', async () => {
            // Arrange
            const store = createS3ObjectStore(config)

            // Act
            const { url } = expectSuccess(await store.presignGet('photos/a.jpg', HOUR))

            // Assert
            const parsed = new URL(url)
            expect(parsed.origin).toBe('https://files.example.test')
            expect(parsed.pathname).toBe('/location-photos/photos/a.jpg')
            expect(parsed.searchParams.get('X-Amz-Credential')).toContain('/garage/s3/aws4_request')
        })

        it('should not add SDK checksum parameters, which Garage rejects', async () => {
            // Arrange
            const store = createS3ObjectStore(config)

            // Act
            const { url } = expectSuccess(await store.presignGet('photos/a.jpg', HOUR))

            // Assert
            const params = [...new URL(url).searchParams.keys()].map((name) => name.toLowerCase())
            expect(params.filter((name) => name.includes('checksum'))).toEqual([])
        })

        it('should return the same URL within a signing window so browsers can cache the image', async () => {
            // Arrange - a quarter of the TTL is 15 minutes
            const first = createS3ObjectStore(config, { now: at('2026-09-29T10:00:05Z') })
            const later = createS3ObjectStore(config, { now: at('2026-09-29T10:14:59Z') })
            const nextWindow = createS3ObjectStore(config, { now: at('2026-09-29T10:15:00Z') })

            // Act
            const a = expectSuccess(await first.presignGet('photos/a.jpg', HOUR))
            const b = expectSuccess(await later.presignGet('photos/a.jpg', HOUR))
            const c = expectSuccess(await nextWindow.presignGet('photos/a.jpg', HOUR))

            // Assert
            expect(b.url).toBe(a.url)
            expect(c.url).not.toBe(a.url)
        })

        it('should keep a URL valid for at least the TTL, wherever in the window it was minted', async () => {
            for (const now of ['2026-09-29T10:00:00Z', '2026-09-29T10:14:59Z']) {
                // Arrange
                const store = createS3ObjectStore(config, { now: at(now) })

                // Act
                const { url, expiresAt } = expectSuccess(await store.presignGet('photos/a.jpg', HOUR))

                // Assert
                expect(expiresAt.getTime() - new Date(now).getTime()).toBeGreaterThanOrEqual(HOUR * 1000)
                const params = new URL(url).searchParams
                expect(Number(params.get('X-Amz-Expires'))).toBeLessThanOrEqual(MAX_PRESIGN_SECONDS)
                expect(signedAt(params.get('X-Amz-Date')!).getTime() + Number(params.get('X-Amz-Expires')) * 1000)
                    .toBe(expiresAt.getTime())
            }
        })

        it.each([0, -1, 1.5, MAX_PRESIGN_SECONDS])('should reject a TTL of %s seconds', async (ttl) => {
            // Arrange
            const store = createS3ObjectStore(config)

            // Act
            const result = expectFailure(await store.presignGet('photos/a.jpg', ttl))

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
        })

        it('should reject an empty key', async () => {
            // Act
            const result = expectFailure(await createS3ObjectStore(config).presignGet('', HOUR))

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
        })
    })

    describe('presignPut', () => {
        it('should sign the content type so an upload of another type is refused', async () => {
            // Arrange
            const store = createS3ObjectStore(config, { now: at('2026-09-29T10:07:00Z') })

            // Act
            const { url, expiresAt } = expectSuccess(await store.presignPut('photos/b.png', 'image/png', 300))

            // Assert
            const params = new URL(url).searchParams
            expect(new URL(url).origin).toBe('https://files.example.test')
            expect(params.get('X-Amz-SignedHeaders')?.split(';')).toContain('content-type')
            expect([...params.keys()].filter((name) => name.toLowerCase().includes('checksum'))).toEqual([])
            expect(expiresAt).toEqual(new Date('2026-09-29T10:12:00Z'))
        })

        it('should reject a missing content type', async () => {
            // Act
            const result = expectFailure(await createS3ObjectStore(config).presignPut('photos/b.png', '', 300))

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
        })
    })

    describe('storage errors', () => {
        it('should report a missing object as NOT_FOUND', async () => {
            // Arrange
            vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(new NoSuchKey({ message: 'NoSuchKey', $metadata: { httpStatusCode: 404 } }))

            // Act
            const result = expectFailure(await createS3ObjectStore(config).get('photos/missing.jpg'))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })

        it('should answer false rather than fail when checking for a missing object', async () => {
            // Arrange
            vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(new NotFound({ message: 'NotFound', $metadata: { httpStatusCode: 404 } }))

            // Act & Assert
            expect(expectSuccess(await createS3ObjectStore(config).exists('photos/missing.jpg'))).toBe(false)
        })

        it.each([
            ['a server error', serviceError('ServiceUnavailable', 503), ErrorCode.UNAVAILABLE],
            ['a network error', Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }), ErrorCode.UNAVAILABLE],
            ['a rejected credential', serviceError('AccessDenied', 403), ErrorCode.INTERNAL_SERVER_ERROR],
        ])('should turn %s into a failed Result instead of throwing', async (_, error, code) => {
            // Arrange
            vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(error)
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const store = createS3ObjectStore(config)

            // Act & Assert
            expect(expectFailure(await store.put('photos/a.jpg', Buffer.from('x'), { contentType: 'image/jpeg' })).code).toBe(code)
            expect(expectFailure(await store.get('photos/a.jpg')).code).toBe(code)
            expect(expectFailure(await store.exists('photos/a.jpg')).code).toBe(code)
            expect(expectFailure(await store.delete('photos/a.jpg')).code).toBe(code)
        })

        it('should report UNAVAILABLE when nothing is listening at the endpoint', async () => {
            // Arrange - port 9 (discard) is closed on the test machine, so the connection is refused immediately
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const store = createS3ObjectStore({ ...config, endpoint: 'http://127.0.0.1:9' })

            // Act
            const result = expectFailure(await store.exists('photos/a.jpg'))

            // Assert
            expect(result.code).toBe(ErrorCode.UNAVAILABLE)
        })
    })
})

/** X-Amz-Date is yyyyMMddTHHmmssZ */
function signedAt(amzDate: string) {
    return new Date(amzDate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'))
}
