// Moves every stored photo into its owner's storage prefix, users/<userId>/photos/<photoId>.<ext> (LS-182). Photos
// stored earlier have keys like photos/<uuid>.jpg, or <timestamp>-<file name> from before the move off MinIO.
//
// Run once after deploying LS-182 (see scripts/migrate-photo-keys.ts); it's safe to run again, or to re-run after an
// interruption. Each photo is copied to its new key, its row is repointed, and only then is the old file deleted, so a
// row always points at a file that exists. A photo whose file is missing is reported and its row left untouched.

import { PrismaClient } from '@prisma/client'
import { getObjectStore, ObjectStore } from '@/infrastructure/storage'
import { isInUserStorage, photoKey } from '@/lib/photoKeys'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'
import { ErrorCode, ok, Result } from '@/schemas/result'
import { guard } from '@/services/serviceResult'

const logger = createLogger('photoKeyMigration')

export type PhotoKeyMigrationReport = {
    /** Moved to the owner's prefix (or, on a dry run, would be) */
    moved: number
    /** Already under the owner's prefix */
    alreadyInPlace: number
    /** Photo ids whose file isn't in storage; their rows are left as they were */
    missing: string[]
    /** Photo ids that changed while being moved (deleted, say); a re-run picks up any that still need it */
    skipped: string[]
    /** Old keys that were moved but couldn't be deleted afterwards. Nothing points to them; delete them by hand. */
    leftovers: string[]
}

export async function migratePhotoKeysToOwnerPrefix(
    options?: { db?: PrismaClient, objectStore?: ObjectStore, dryRun?: boolean, batchSize?: number }
): Promise<Result<PhotoKeyMigrationReport>> {
    const db = options?.db ?? prisma
    const dryRun = options?.dryRun ?? false
    const batchSize = options?.batchSize ?? 200

    return guard(logger, 'migrate photo keys', async () => {
        const objectStore = options?.objectStore ?? getObjectStore()
        const report: PhotoKeyMigrationReport = { moved: 0, alreadyInPlace: 0, missing: [], skipped: [], leftovers: [] }

        let cursor: string | undefined
        for (;;) {
            const photos = await db.photo.findMany({
                orderBy: { id: 'asc' },
                take: batchSize,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                select: { id: true, storageKey: true, location: { select: { userId: true } } },
            })
            if (photos.length === 0) break
            cursor = photos[photos.length - 1].id

            for (const photo of photos) {
                const ownerId = photo.location.userId
                if (isInUserStorage(photo.storageKey, ownerId)) {
                    report.alreadyInPlace++
                    continue
                }
                // Named after the photo, so a re-run after an interruption finds the copy it already made
                const target = photoKey(ownerId, photo.id, photo.storageKey)

                const copied = await objectStore.exists(target)
                if (!copied.success) return copied
                if (!copied.data) {
                    const source = await objectStore.exists(photo.storageKey)
                    if (!source.success) return source
                    if (!source.data) {
                        logger.warn(`Photo ${photo.id} has no file at ${photo.storageKey}; leaving it as it is`)
                        report.missing.push(photo.id)
                        continue
                    }
                    if (!dryRun) {
                        const copy = await objectStore.copy(photo.storageKey, target)
                        // NOT_FOUND here means the file was deleted since we looked, along with its photo most likely
                        if (!copy.success && copy.code === ErrorCode.NOT_FOUND) {
                            report.skipped.push(photo.id)
                            continue
                        }
                        if (!copy.success) return copy
                    }
                }

                if (dryRun) {
                    report.moved++
                    continue
                }

                // Only repoint a row that still has the key we copied from
                const { count } = await db.photo.updateMany({
                    where: { id: photo.id, storageKey: photo.storageKey },
                    data: { storageKey: target },
                })
                if (count === 0) {
                    const current = await db.photo.findUnique({ where: { id: photo.id }, select: { storageKey: true } })
                    if (current?.storageKey !== target) {
                        await objectStore.delete(target)
                    }
                    report.skipped.push(photo.id)
                    continue
                }

                const removed = await objectStore.delete(photo.storageKey)
                if (!removed.success) {
                    report.leftovers.push(photo.storageKey)
                }
                report.moved++
            }
        }

        return ok(report)
    })
}
