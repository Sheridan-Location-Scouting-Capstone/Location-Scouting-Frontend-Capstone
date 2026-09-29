import { parseObjectStoreConfig, parsePhotoUrlTtlSeconds } from '@/infrastructure/storage/config'
import type { ObjectStore } from '@/infrastructure/storage/objectStore'
import { createS3ObjectStore } from '@/infrastructure/storage/s3ObjectStore'
import type { Result } from '@/schemas/result'

export type { ObjectStore, PresignedUrl, PutOptions, StoredObject } from '@/infrastructure/storage/objectStore'

// Kept on globalThis so dev hot reloads reuse one client (the same trick as lib/prisma.ts)
const globalForStorage = globalThis as unknown as { objectStore?: ObjectStore }

/** The app's object store, configured from the environment */
export function getObjectStore(): ObjectStore {
    globalForStorage.objectStore ??= createS3ObjectStore(orThrow(parseObjectStoreConfig()))
    return globalForStorage.objectStore
}

export function getPhotoUrlTtlSeconds(): number {
    return orThrow(parsePhotoUrlTtlSeconds())
}

/**
 * Throws one error listing every storage setting that's missing or invalid. The server calls this at start
 * (src/instrumentation.ts) so a misconfigured deployment fails to boot instead of failing on the first photo.
 */
export function assertStorageConfigured(env: Record<string, string | undefined> = process.env) {
    const problems = [parseObjectStoreConfig(env), parsePhotoUrlTtlSeconds(env)]
        .flatMap((result) => (result.success ? [] : [result.error]))
    if (problems.length > 0) {
        throw new Error(problems.join('\n'))
    }
}

function orThrow<T>(result: Result<T>): T {
    if (!result.success) throw new Error(result.error)
    return result.data
}
