import { randomUUID } from 'node:crypto'
import path from 'node:path'

// Where photos live in object storage: users/<userId>/photos/<name>.<ext>
//
// Storage mirrors ownership: everything a user owns sits under their own prefix, which is also what presigned uploads
// get scoped to (LS-168). The prefix organises storage; it doesn't grant access. Access is decided by
// photoService.withPhotoUrls, from the photo's location's owner in the database.

// A user id becomes part of a storage path, so it has to be a plain identifier: no "/", "..", spaces or escapes
const PLAIN_ID = /^[A-Za-z0-9_-]{1,128}$/

export function userStoragePrefix(userId: string): string {
    if (!PLAIN_ID.test(userId)) {
        throw new Error('A user id must be a plain identifier to be used in a storage key')
    }
    return `users/${userId}/`
}

export function isInUserStorage(key: string, userId: string): boolean {
    return key.startsWith(userStoragePrefix(userId))
}

/** A key for a newly uploaded photo: a fresh name, keeping nothing of the user's file name but a plain extension */
export function newPhotoKey(userId: string, filename: string): string {
    return photoKey(userId, randomUUID(), filename)
}

/** users/<userId>/photos/<name><.ext>, the extension taken from `extensionFrom` (a file name or an older key) */
export function photoKey(userId: string, name: string, extensionFrom: string): string {
    const extension = path.extname(extensionFrom).toLowerCase()
    return `${userStoragePrefix(userId)}photos/${name}${/^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ''}`
}
