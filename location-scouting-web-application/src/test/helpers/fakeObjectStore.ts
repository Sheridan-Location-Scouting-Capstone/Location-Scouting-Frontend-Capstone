import { Readable } from 'node:stream'
import type { ObjectStore, PutOptions } from '@/infrastructure/storage'
import { ErrorCode, fail, ok } from '@/schemas/result'

export const FAKE_STORAGE_URL = 'https://storage.test'

/**
 * In-memory ObjectStore for service tests that don't need a real Garage. Presigned URLs are recognisable fakes
 * (https://storage.test/<key>?ttl=<seconds>). To simulate a failure, vi.spyOn one of its methods.
 */
export class FakeObjectStore implements ObjectStore {
    readonly objects = new Map<string, { body: Buffer } & PutOptions>()

    async put(key: string, body: Buffer, options: PutOptions) {
        this.objects.set(key, { body, ...options })
        return ok(undefined)
    }

    async get(key: string) {
        const object = this.objects.get(key)
        if (!object) return fail(ErrorCode.NOT_FOUND, `No stored object at ${key}`)
        return ok({ body: Readable.from(object.body), contentType: object.contentType, contentLength: object.body.length })
    }

    async delete(key: string) {
        this.objects.delete(key)
        return ok(undefined)
    }

    async exists(key: string) {
        return ok(this.objects.has(key))
    }

    async presignGet(key: string, ttlSeconds: number) {
        return ok({ url: `${FAKE_STORAGE_URL}/${key}?ttl=${ttlSeconds}`, expiresAt: new Date(Date.now() + ttlSeconds * 1000) })
    }

    async presignPut(key: string, contentType: string, ttlSeconds: number) {
        return ok({
            url: `${FAKE_STORAGE_URL}/${key}?ttl=${ttlSeconds}&type=${encodeURIComponent(contentType)}`,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        })
    }
}
