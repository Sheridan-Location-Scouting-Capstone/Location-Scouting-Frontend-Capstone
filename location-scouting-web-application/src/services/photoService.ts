import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { getObjectStore, getPhotoUrlTtlSeconds, ObjectStore } from '@/infrastructure/storage'
import { PhotoUploadInput } from '@/schemas/photoUploadInput'
import { ok, Result } from '@/schemas/result'
import { createLogger } from '@/lib/logger'
import { guard } from '@/services/serviceResult'

// Photo files in object storage. Label detection is separate (visionService) so a Vision outage can't break uploads.
//
// The database keeps only each photo's storage key; the bucket is private. Clients (the web app now, native apps later)
// get a presigned URL instead, minted by withPhotoUrls every time photos are loaded.

const logger = createLogger('photoService')

/** A photo's key is never reused, so what's stored under it never changes and can be cached indefinitely */
const PHOTO_CACHE_CONTROL = 'private, max-age=31536000, immutable'

/** A photo row as it goes to a client: its storage key replaced by a URL the client can load until urlExpiresAt */
export type PhotoWithUrl<P extends { storageKey: string }> = Omit<P, 'storageKey'> & { url: string; urlExpiresAt: Date }

/** Uploads the photos, all or nothing, and returns their storage keys in the same order */
export async function storePhotos(
    inputs: PhotoUploadInput[],
    options?: { objectStore?: ObjectStore }
): Promise<Result<string[]>> {
    return guard(logger, 'store photos', async () => {
        const objectStore = options?.objectStore ?? getObjectStore()
        const keys = inputs.map((input) => photoKey(input.filename))

        const results = await Promise.all(inputs.map((input, index) =>
            objectStore.put(keys[index], input.buffer, { contentType: input.mimeType, cacheControl: PHOTO_CACHE_CONTROL })))

        const failure = results.find((result) => !result.success)
        if (failure) {
            const stored = keys.filter((_, index) => results[index].success)
            const cleanup = await deletePhotos(stored, { objectStore })
            if (!cleanup.success) {
                logger.warn(`Left ${stored.length} orphaned photo(s) in storage after a failed upload`)
            }
            return failure
        }
        return ok(keys)
    })
}

export async function deletePhotos(keys: string[], options?: { objectStore?: ObjectStore }): Promise<Result<void>> {
    return guard(logger, 'delete photos', async () => {
        const objectStore = options?.objectStore ?? getObjectStore()
        const results = await Promise.all(keys.map((key) => objectStore.delete(key)))
        return results.find((result) => !result.success) ?? ok(undefined)
    })
}

/**
 * Replaces each photo's storage key with a presigned URL. Every photo URL the app hands out is minted here, so this is
 * the one place to decide who may see a photo.
 */
export async function withPhotoUrls<P extends { storageKey: string }>(
    userId: string,
    photos: P[],
    options?: { objectStore?: ObjectStore, ttlSeconds?: number }
): Promise<Result<PhotoWithUrl<P>[]>> {
    // TODO(LS-182): check that userId may see these photos before minting their URLs
    return guard(logger, 'sign photo URLs', async () => {
        const objectStore = options?.objectStore ?? getObjectStore()
        const ttlSeconds = options?.ttlSeconds ?? getPhotoUrlTtlSeconds()

        const withUrls: PhotoWithUrl<P>[] = []
        for (const { storageKey, ...photo } of photos) {
            const presigned = await objectStore.presignGet(storageKey, ttlSeconds)
            if (!presigned.success) return presigned
            withUrls.push({ ...photo, url: presigned.data.url, urlExpiresAt: presigned.data.expiresAt })
        }
        return ok(withUrls)
    })
}

/** photos/<uuid>.<ext>: unique per upload, and free of the user's file name apart from a plain extension */
function photoKey(filename: string) {
    const extension = path.extname(filename).toLowerCase()
    return `photos/${randomUUID()}${/^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ''}`
}
