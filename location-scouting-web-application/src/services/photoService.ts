import { PrismaClient } from '@prisma/client'
import { getObjectStore, getPhotoUrlTtlSeconds, ObjectStore } from '@/infrastructure/storage'
import { PhotoUploadInput } from '@/schemas/photoUploadInput'
import { ErrorCode, fail, ok, Result } from '@/schemas/result'
import { createLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { newPhotoKey } from '@/lib/photoKeys'
import { guard } from '@/services/serviceResult'

// Photo files in object storage. Label detection is separate (visionService) so a Vision outage can't break uploads.
//
// The database keeps only each photo's storage key; the bucket is private. Clients (the web app now, native apps later)
// get a presigned URL instead, minted by withPhotoUrls every time photos are loaded, and only for photos they own.
// See docs/decisions/photo-access.md.

const logger = createLogger('photoService')

/** A photo's key is never reused, so what's stored under it never changes and can be cached indefinitely */
const PHOTO_CACHE_CONTROL = 'private, max-age=31536000, immutable'

/** A photo row as it goes to a client: its storage key replaced by a URL the client can load until urlExpiresAt */
export type PhotoWithUrl<P extends { id: string }> = Omit<P, 'storageKey'> & { url: string; urlExpiresAt: Date }

/** Uploads the photos to the owner's storage prefix, all or nothing, and returns their keys in the same order */
export async function storePhotos(
    userId: string,
    inputs: PhotoUploadInput[],
    options?: { objectStore?: ObjectStore }
): Promise<Result<string[]>> {
    return guard(logger, 'store photos', async () => {
        const objectStore = options?.objectStore ?? getObjectStore()
        const keys = inputs.map((input) => newPhotoKey(userId, input.filename))

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
 * Adds a presigned URL to each photo, if the user owns every one of them, and drops any storage key the caller passed.
 *
 * This is the gate to the photo bytes: every photo URL the app hands out is minted here, and only after checking that
 * the photo's location belongs to the user. The key that gets signed is read from the database alongside that check,
 * never taken from the caller, so a row with the wrong key attached can't be used to reach someone else's file.
 *
 * A photo the user doesn't own fails the whole call with NOT_FOUND (rather than FORBIDDEN, so it doesn't confirm the
 * photo exists), and no URL is minted for any of them. Callers only pass photos they loaded for this user, so a
 * refusal here means a bug or a probe, and it's logged.
 */
export async function withPhotoUrls<P extends { id: string }>(
    userId: string,
    photos: P[],
    options?: { db?: PrismaClient, objectStore?: ObjectStore, ttlSeconds?: number }
): Promise<Result<PhotoWithUrl<P>[]>> {
    const db = options?.db ?? prisma

    return guard(logger, 'sign photo URLs', async () => {
        if (photos.length === 0) return ok([])
        const objectStore = options?.objectStore ?? getObjectStore()
        const ttlSeconds = options?.ttlSeconds ?? getPhotoUrlTtlSeconds()

        const owned = await db.photo.findMany({
            where: { id: { in: [...new Set(photos.map((photo) => photo.id))] }, location: { userId } },
            select: { id: true, storageKey: true },
        })
        const keyById = new Map(owned.map((photo) => [photo.id, photo.storageKey]))

        const notOwned = photos.filter((photo) => !keyById.has(photo.id))
        if (notOwned.length > 0) {
            logger.warn(`Refused to sign URLs for ${notOwned.length} photo(s) that user ${userId} doesn't own`)
            return fail(ErrorCode.NOT_FOUND, 'Photo not found')
        }

        const withUrls: PhotoWithUrl<P>[] = []
        for (const photo of photos) {
            const presigned = await objectStore.presignGet(keyById.get(photo.id)!, ttlSeconds)
            if (!presigned.success) return presigned
            withUrls.push({ ...withoutStorageKey(photo), url: presigned.data.url, urlExpiresAt: presigned.data.expiresAt })
        }
        return ok(withUrls)
    })
}

function withoutStorageKey<P extends object>(photo: P): Omit<P, 'storageKey'> {
    const copy: Partial<P> & { storageKey?: unknown } = { ...photo }
    delete copy.storageKey
    return copy as Omit<P, 'storageKey'>
}
