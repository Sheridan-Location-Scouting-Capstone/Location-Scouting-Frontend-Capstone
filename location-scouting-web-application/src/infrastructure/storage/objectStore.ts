import type { Readable } from 'node:stream'
import type { Result } from '@/schemas/result'

// Object storage (files such as location photos) behind the S3 API. The bucket is private: the app stores only object
// keys, and a client reaches a file through a presigned URL minted on the server.
//
// Every operation reports failure as a Result: NOT_FOUND for a missing object, UNAVAILABLE when storage can't be
// reached, VALIDATION_FAILED for a bad argument, INTERNAL_SERVER_ERROR for anything else (e.g. rejected credentials).

export type PutOptions = {
    contentType: string
    /** Sent back as the Cache-Control header whenever the object is downloaded */
    cacheControl?: string
}

export type StoredObject = {
    /** The caller must read this to the end or destroy it; an abandoned stream holds its connection open */
    body: Readable
    contentType: string | undefined
    contentLength: number | undefined
}

export type PresignedUrl = {
    url: string
    expiresAt: Date
}

export interface ObjectStore {
    put(key: string, body: Buffer, options: PutOptions): Promise<Result<void>>

    get(key: string): Promise<Result<StoredObject>>

    /** Succeeds when the object is already gone */
    delete(key: string): Promise<Result<void>>

    exists(key: string): Promise<Result<boolean>>

    /** A URL anyone holding it can download the object from, for at least `ttlSeconds` */
    presignGet(key: string, ttlSeconds: number): Promise<Result<PresignedUrl>>

    /** A URL that accepts one upload of exactly `contentType` to `key`, for `ttlSeconds` */
    presignPut(key: string, contentType: string, ttlSeconds: number): Promise<Result<PresignedUrl>>
}
