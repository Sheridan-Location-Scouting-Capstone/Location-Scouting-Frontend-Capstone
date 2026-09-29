// ObjectStore over the S3 API, written against Garage (any S3-compatible server works).

import type { Readable } from 'node:stream'
import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ClientConfig,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ObjectStoreConfig } from '@/infrastructure/storage/config'
import type { ObjectStore, PresignedUrl } from '@/infrastructure/storage/objectStore'
import { ErrorCode, fail, ok, Result } from '@/schemas/result'
import { createLogger } from '@/lib/logger'

const logger = createLogger('objectStore')

/** SigV4 refuses presigned URLs that live longer than a week */
export const MAX_PRESIGN_SECONDS = 604_800

const CLIENT_DEFAULTS = {
    // Garage serves buckets as a path (host/bucket/key), not as subdomains
    forcePathStyle: true,
    // The SDK's default flexible checksums bake a CRC32 of an empty body into presigned upload URLs, which Garage
    // then rejects when the real body arrives. Only send checksums when an operation requires one.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
} satisfies Partial<S3ClientConfig>

export function createS3ObjectStore(config: ObjectStoreConfig, options?: { now?: () => Date }): ObjectStore {
    const now = options?.now ?? (() => new Date())
    const Bucket = config.bucket
    const credentials = { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }

    const client = new S3Client({
        ...CLIENT_DEFAULTS,
        endpoint: config.endpoint,
        region: config.region,
        credentials,
        requestHandler: { connectionTimeout: 5_000, requestTimeout: 30_000 },
    })

    // A presigned URL is signed for the host it will be fetched from, so it's signed with the public endpoint.
    // Signing is local: this client never sends a request.
    const signer = new S3Client({
        ...CLIENT_DEFAULTS,
        endpoint: config.publicEndpoint,
        region: config.region,
        credentials,
    })

    return {
        put: (key, body, { contentType, cacheControl }) => attempt(`store ${key}`, key, async () => {
            await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }))
            return ok(undefined)
        }),

        get: (key) => attempt(`read ${key}`, key, async () => {
            const object = await client.send(new GetObjectCommand({ Bucket, Key: key }))
            return ok({
                body: object.Body as Readable,
                contentType: object.ContentType,
                contentLength: object.ContentLength,
            })
        }),

        delete: (key) => attempt(`delete ${key}`, key, async () => {
            // S3 deletes are idempotent: deleting a missing key succeeds
            await client.send(new DeleteObjectCommand({ Bucket, Key: key }))
            return ok(undefined)
        }),

        exists: (key) => attempt(`check ${key}`, key, async () => {
            try {
                await client.send(new HeadObjectCommand({ Bucket, Key: key }))
                return ok(true)
            } catch (error) {
                if (isMissingObject(error)) return ok(false)
                throw error
            }
        }),

        copy: (sourceKey, destinationKey) => attempt(`copy ${sourceKey} to ${destinationKey}`, destinationKey, async () => {
            const invalid = checkKey(sourceKey)
            if (invalid) return invalid
            // CopySource is "<bucket>/<key>", URL-encoded apart from the slashes. The source's metadata (content type,
            // cache header) comes along by default.
            const CopySource = `${Bucket}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`
            await client.send(new CopyObjectCommand({ Bucket, Key: destinationKey, CopySource }))
            return ok(undefined)
        }),

        presignGet: async (key, ttlSeconds) => {
            // Signing at the start of a window (a quarter of the TTL) instead of "now" makes every call in that window
            // return the same URL, so browsers reuse the cached image across page loads. The window is added to the
            // expiry, so a URL minted at the end of a window still lives for the full TTL.
            const windowSeconds = Math.floor(ttlSeconds / 4)
            const expiresIn = ttlSeconds + windowSeconds
            const invalid = checkKey(key) ?? checkTtl(ttlSeconds, expiresIn)
            if (invalid) return invalid

            const windowMs = Math.max(windowSeconds, 1) * 1000
            const signingDate = new Date(Math.floor(now().getTime() / windowMs) * windowMs)
            return presign(new GetObjectCommand({ Bucket, Key: key }), signingDate, expiresIn)
        },

        presignPut: async (key, contentType, ttlSeconds) => {
            const invalid = checkKey(key) ?? checkTtl(ttlSeconds, ttlSeconds)
                ?? (contentType ? undefined : fail(ErrorCode.VALIDATION_FAILED, 'A content type is required'))
            if (invalid) return invalid

            // Only the host is signed by default, which would let the holder upload any type (text/html included).
            // Signing the content type makes storage refuse an upload that doesn't match it.
            return presign(new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), now(), ttlSeconds, ['content-type'])
        },
    }

    async function presign(
        command: GetObjectCommand | PutObjectCommand,
        signingDate: Date,
        expiresIn: number,
        signedHeaders: string[] = [],
    ): Promise<Result<PresignedUrl>> {
        try {
            const url = await getSignedUrl(signer, command, { expiresIn, signingDate, signableHeaders: new Set(signedHeaders) })
            return ok({ url, expiresAt: new Date(truncateToSecond(signingDate) + expiresIn * 1000) })
        } catch (error) {
            logger.error(`Failed to sign a URL for ${command.input.Key}`, error)
            return fail(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to sign a storage URL')
        }
    }
}

async function attempt<T>(operation: string, key: string, run: () => Promise<Result<T>>): Promise<Result<T>> {
    const invalid = checkKey(key)
    if (invalid) return invalid

    try {
        return await run()
    } catch (error) {
        if (isMissingObject(error)) {
            return fail(ErrorCode.NOT_FOUND, `No stored object at ${key}`)
        }
        logger.error(`Failed to ${operation}`, error)
        return isUnreachable(error)
            ? fail(ErrorCode.UNAVAILABLE, 'Object storage is unavailable')
            : fail(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to ${operation}`)
    }
}

function checkKey(key: string) {
    return key ? undefined : fail(ErrorCode.VALIDATION_FAILED, 'An object key is required')
}

function checkTtl(ttlSeconds: number, expiresIn: number) {
    if (Number.isInteger(ttlSeconds) && ttlSeconds > 0 && expiresIn <= MAX_PRESIGN_SECONDS) return undefined
    return fail(ErrorCode.VALIDATION_FAILED, `A presigned URL lifetime must be a whole number of seconds that fits within ${MAX_PRESIGN_SECONDS}`)
}

function isMissingObject(error: unknown) {
    const name = (error as { name?: string } | null)?.name
    return name === 'NoSuchKey' || name === 'NotFound'
}

/** No HTTP response at all (connection refused, DNS, timeout) or a server-side error */
function isUnreachable(error: unknown) {
    const status = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode
    return status === undefined || status >= 500
}

/** X-Amz-Date has whole seconds, so the URL's real expiry is counted from the truncated signing time */
function truncateToSecond(date: Date) {
    return Math.floor(date.getTime() / 1000) * 1000
}
