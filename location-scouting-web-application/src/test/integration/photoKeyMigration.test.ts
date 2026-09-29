import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { migratePhotoKeysToOwnerPrefix } from '@/maintenance/photoKeyMigration'
import { getObjectStore } from '@/infrastructure/storage'
import { createLocation } from '@/services/locationService'
import { addPhotosToLocation } from '@/services/locationPhotoService'
import { withPhotoUrls } from '@/services/photoService'
import { prisma } from '@/test/setup'
import { signUpSetup } from '@/test/e2e/fixtures'
import { buildLocationInput } from '@/test/helpers/builders'
import { expectSuccess } from '@/test/helpers/result'
import { listTestBucket } from '@/test/helpers/testBucket'

// Moves photos stored before LS-182 (keys like photos/<uuid>.jpg, or <timestamp>-<file name> from the MinIO days)
// into their owner's prefix, users/<userId>/photos/<photoId>.<ext>. Against the Garage test container.

const objectStore = getObjectStore()

async function readObject(key: string) {
    const object = expectSuccess(await objectStore.get(key))
    const chunks: Buffer[] = []
    for await (const chunk of object.body) chunks.push(chunk)
    return { contentType: object.contentType, body: Buffer.concat(chunks).toString() }
}

/** A photo row and its file, stored under a pre-LS-182 key */
async function legacyPhoto(locationId: string, storageKey: string, contents: string) {
    expectSuccess(await objectStore.put(storageKey, Buffer.from(contents), { contentType: 'image/jpeg' }))
    return prisma.photo.create({ data: { locationId, storageKey, name: contents } })
}

describe('migratePhotoKeysToOwnerPrefix', () => {
    let ownerId: string
    let otherId: string
    let ownerLocationId: string
    let otherLocationId: string

    beforeEach(async () => {
        ownerId = (await signUpSetup()).userId
        otherId = (await signUpSetup()).userId
        ownerLocationId = expectSuccess(await createLocation(ownerId, buildLocationInput(), { db: prisma })).id
        otherLocationId = expectSuccess(await createLocation(otherId, buildLocationInput(), { db: prisma })).id
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should move each photo into its owner\'s prefix, file and row together', async () => {
        // Arrange
        const lsTwoTwoSix = await legacyPhoto(ownerLocationId, 'photos/0b2f6c1e-1111-4a4a-9c9c-000000000001.jpg', 'owner photo')
        const minioEra = await legacyPhoto(otherLocationId, '1700000000000-Back Alley.JPG', 'other photo')

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))

        // Assert
        expect(report).toEqual({ moved: 2, alreadyInPlace: 0, missing: [], skipped: [], leftovers: [] })

        const ownerPhoto = await prisma.photo.findUniqueOrThrow({ where: { id: lsTwoTwoSix.id } })
        const otherPhoto = await prisma.photo.findUniqueOrThrow({ where: { id: minioEra.id } })
        expect(ownerPhoto.storageKey).toBe(`users/${ownerId}/photos/${lsTwoTwoSix.id}.jpg`)
        expect(otherPhoto.storageKey).toBe(`users/${otherId}/photos/${minioEra.id}.jpg`)

        expect(await readObject(ownerPhoto.storageKey)).toEqual({ contentType: 'image/jpeg', body: 'owner photo' })
        expect(await readObject(otherPhoto.storageKey)).toEqual({ contentType: 'image/jpeg', body: 'other photo' })
        expect((await listTestBucket()).sort()).toEqual([ownerPhoto.storageKey, otherPhoto.storageKey].sort())
    })

    it('should leave photos that are already under their owner\'s prefix alone', async () => {
        // Arrange - uploaded after LS-182
        const [uploaded] = expectSuccess(await addPhotosToLocation(ownerId, ownerLocationId, [
            { buffer: Buffer.from('new photo'), filename: 'new.jpg', mimeType: 'image/jpeg' },
        ], { db: prisma, labelDetector: async () => [] }))

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))

        // Assert
        expect(report).toEqual({ moved: 0, alreadyInPlace: 1, missing: [], skipped: [], leftovers: [] })
        expect((await prisma.photo.findUniqueOrThrow({ where: { id: uploaded.id } })).storageKey).toBe(uploaded.storageKey)
        expect(await listTestBucket()).toEqual([uploaded.storageKey])
    })

    it('should do nothing more when run again', async () => {
        // Arrange
        await legacyPhoto(ownerLocationId, 'photos/a.jpg', 'a')
        await legacyPhoto(otherLocationId, 'photos/b.jpg', 'b')
        expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))
        const bucketAfterFirstRun = (await listTestBucket()).sort()

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))

        // Assert
        expect(report).toEqual({ moved: 0, alreadyInPlace: 2, missing: [], skipped: [], leftovers: [] })
        expect((await listTestBucket()).sort()).toEqual(bucketAfterFirstRun)
    })

    it('should report a photo whose file is missing and leave its row as it was', async () => {
        // Arrange - a row from before the move off MinIO, whose file never made it to Garage
        const lost = await prisma.photo.create({ data: { locationId: ownerLocationId, storageKey: '1700000000000-lost.jpg' } })
        const kept = await legacyPhoto(ownerLocationId, 'photos/kept.jpg', 'kept')

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))

        // Assert
        expect(report).toEqual({ moved: 1, alreadyInPlace: 0, missing: [lost.id], skipped: [], leftovers: [] })
        expect((await prisma.photo.findUniqueOrThrow({ where: { id: lost.id } })).storageKey).toBe('1700000000000-lost.jpg')
        expect((await prisma.photo.findUniqueOrThrow({ where: { id: kept.id } })).storageKey).toBe(`users/${ownerId}/photos/${kept.id}.jpg`)
    })

    it('should only report what it would do on a dry run', async () => {
        // Arrange
        const photo = await legacyPhoto(ownerLocationId, 'photos/a.jpg', 'a')
        const lost = await prisma.photo.create({ data: { locationId: ownerLocationId, storageKey: 'photos/lost.jpg' } })

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma, dryRun: true }))

        // Assert
        expect(report).toEqual({ moved: 1, alreadyInPlace: 0, missing: [lost.id], skipped: [], leftovers: [] })
        expect((await prisma.photo.findUniqueOrThrow({ where: { id: photo.id } })).storageKey).toBe('photos/a.jpg')
        expect(await listTestBucket()).toEqual(['photos/a.jpg'])
    })

    it('should pick up where an interrupted run stopped', async () => {
        // Arrange - an earlier run copied the file, then stopped before repointing the row
        const photo = await legacyPhoto(ownerLocationId, 'photos/a.jpg', 'a')
        expectSuccess(await objectStore.copy('photos/a.jpg', `users/${ownerId}/photos/${photo.id}.jpg`))

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))

        // Assert
        expect(report).toEqual({ moved: 1, alreadyInPlace: 0, missing: [], skipped: [], leftovers: [] })
        expect((await prisma.photo.findUniqueOrThrow({ where: { id: photo.id } })).storageKey).toBe(`users/${ownerId}/photos/${photo.id}.jpg`)
        expect(await listTestBucket()).toEqual([`users/${ownerId}/photos/${photo.id}.jpg`])
    })

    it('should skip a photo changed while it was being moved, and remove the copy nobody points to', async () => {
        // Arrange - the row's key changes between the copy and the update (e.g. the photo is deleted meanwhile)
        const photo = await legacyPhoto(ownerLocationId, 'photos/a.jpg', 'a')
        vi.spyOn(prisma.photo, 'updateMany').mockResolvedValueOnce({ count: 0 })

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))

        // Assert
        expect(report).toEqual({ moved: 0, alreadyInPlace: 0, missing: [], skipped: [photo.id], leftovers: [] })
        expect(await listTestBucket()).toEqual(['photos/a.jpg'])
    })

    it('should work through more photos than fit in one batch', async () => {
        // Arrange
        for (let i = 0; i < 5; i++) await legacyPhoto(ownerLocationId, `photos/${i}.jpg`, `photo ${i}`)

        // Act
        const report = expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma, batchSize: 2 }))

        // Assert
        expect(report.moved).toBe(5)
        const keys = (await prisma.photo.findMany()).map((photo) => photo.storageKey)
        for (const key of keys) expect(key.startsWith(`users/${ownerId}/photos/`)).toBe(true)
    })

    it('should leave moved photos viewable by their owner', async () => {
        // Arrange
        const photo = await legacyPhoto(ownerLocationId, 'photos/a.jpg', 'still here')
        expectSuccess(await migratePhotoKeysToOwnerPrefix({ db: prisma }))
        const moved = await prisma.photo.findUniqueOrThrow({ where: { id: photo.id } })

        // Act
        const [withUrl] = expectSuccess(await withPhotoUrls(ownerId, [moved], { db: prisma }))

        // Assert
        expect(await (await fetch(withUrl.url)).text()).toBe('still here')
    })
})
