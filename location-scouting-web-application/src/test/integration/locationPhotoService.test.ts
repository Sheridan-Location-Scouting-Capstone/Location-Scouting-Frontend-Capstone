import {afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {createLocation, deleteLocationById} from "@/services/locationService";
import {prisma} from "@/test/setup";
import {
    addPhotosToLocation,
    removePhotosFromLocation,
    updatePhoto,
    updatePhotoDisplayOrder
} from "@/services/locationPhotoService";
import {signUpSetup} from "@/test/e2e/fixtures";
import {expectFailure, expectSuccess} from "@/test/helpers/result";
import {buildLocationInput} from "@/test/helpers/builders";
import {ErrorCode} from "@/schemas/result";
import {LabelDetector} from "@/services/visionService";
import {listTestBucket} from "@/test/helpers/testBucket";

describe('Location Photo Service', () => {
    let userId: string

    beforeEach(async () => {
        const user = await signUpSetup()
        userId = user.userId
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('addPhotosToLocation', async() => {

        let locationId: string

        beforeEach(async () => {
            const createdLocation = expectSuccess(await createLocation(userId, buildLocationInput(), { db : prisma }))
            expect(createdLocation.id).toBeDefined()
            expect(createdLocation.id).not.toBeNull()
            locationId = createdLocation.id
        })

        it('Should be able to upload location photos', async () => {
            // Arrange
            // Photo upload input
            const photoInput = [{
                    locationId: locationId,
                    buffer: Buffer.from('fake image data'),
                    filename: 'alley.jpg',
                    mimeType: 'image/jpeg'
                },
                {
                    locationId: locationId,
                    buffer: Buffer.from('another fake image'),
                    filename: 'alley2.jpg',
                    mimeType: 'image/jpeg'
                }]

            // Act - Upload photos to the location
            const result = expectSuccess(await addPhotosToLocation(userId, locationId, photoInput, { db: prisma }))

            // Assert
            expect(result).not.toBeNull()
            expect(result).toHaveLength(2)
            expect(result[0].name).toBe('alley.jpg')
            expect(result[1].name).toBe('alley2.jpg')
            expect(result[0].locationId).toBe(locationId)
            expect(result[1].locationId).toBe(locationId)
        })

        it('Should save a client specified name for a photo', async() => {
            // Arrange
            const firstPhotoName = 'Alley from North'
            const lastPhotoName = 'Alley from South'
            const photoInput = [{
                    locationId: locationId,
                    buffer: Buffer.from('fake image data'),
                    filename: 'alley.jpg',
                    name: firstPhotoName,
                    mimeType: 'image/jpeg'
                },
                {
                    locationId: locationId,
                    buffer: Buffer.from('another fake image'),
                    filename: 'alley2.jpg',
                    name: lastPhotoName,
                    mimeType: 'image/jpeg'
                }]

            // Act
            const result = expectSuccess(await addPhotosToLocation(userId, locationId, photoInput, { db : prisma }))

            // Assert
            expect(result).toHaveLength(2)
            expect(result[0].name).toBe(firstPhotoName)
            expect(result[1].name).toBe(lastPhotoName)
            expect(result[0].locationId).toBe(locationId)
            expect(result[1].locationId).toBe(locationId)
        })

        it('should automatically assign a display order value if unspecified', async() => {
            // Arrange
            const firstPhotoInput = [{
                locationId: locationId,
                buffer: Buffer.from('fake image data'),
                filename: 'alley.jpg',
                name: 'Alley',
                mimeType: 'image/jpeg'
            }]

            // Act first photo
            const firstPhotoResult = expectSuccess(await addPhotosToLocation(userId, locationId, firstPhotoInput, { db: prisma }))

            // Assert that the display order is present and a positive number
            expect(firstPhotoResult[0].displayOrder).toBeDefined()
            expect(firstPhotoResult[0].displayOrder).not.toBeNull()
            expect(firstPhotoResult[0].displayOrder).toBeGreaterThan(-1)

            // Act - add second photo
            const secondPhotoResult = expectSuccess(await addPhotosToLocation(userId, locationId, firstPhotoInput, { db: prisma }))

            // Assert - Second Photo should be greater than the first display photo
            expect(secondPhotoResult[0].displayOrder).toBeDefined()
            expect(secondPhotoResult[0].displayOrder).not.toBeNull()
            expect(secondPhotoResult[0].displayOrder).toBeGreaterThan(firstPhotoResult[0].displayOrder)
        })

        it('should reject adding photos to a location that has been deleted', async () => {
            // Arrange
            expectSuccess(await deleteLocationById(userId, locationId, { db: prisma }))

            // Act
            const result = expectFailure(await addPhotosToLocation(userId, locationId, [
                { buffer: Buffer.from('photo'), filename: 'a.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })

        it('should remove the uploaded files when the photo rows cannot be saved', async () => {
            // Arrange
            vi.spyOn(prisma.photo, 'createManyAndReturn').mockRejectedValueOnce(new Error('database unavailable'))
            vi.spyOn(console, 'error').mockImplementation(() => {})

            // Act
            const result = expectFailure(await addPhotosToLocation(userId, locationId, [
                { buffer: Buffer.from('photo'), filename: 'a.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR)
            expect(await listTestBucket()).toEqual([])
        })
    })

    describe('photo label detection', () => {
        let locationId: string

        beforeEach(async () => {
            const location = expectSuccess(await createLocation(userId, { ...buildLocationInput(), keywords: ['brick'] }, { db: prisma }))
            locationId = location.id
        })

        it('should add detected labels to the location\'s keywords without duplicates', async () => {
            // Arrange
            const labelDetector = vi.fn<LabelDetector>()
                .mockResolvedValueOnce(['Building', 'brick'])
                .mockResolvedValueOnce(['Street'])

            // Act
            expectSuccess(await addPhotosToLocation(userId, locationId, [
                { buffer: Buffer.from('one'), filename: 'one.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('two'), filename: 'two.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma, labelDetector }))

            // Assert
            expect(labelDetector).toHaveBeenCalledTimes(2)
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.keywords).toEqual(['brick', 'Building', 'Street'])
        })

        it('should still save the photos when label detection finds nothing', async () => {
            // Act
            const photos = expectSuccess(await addPhotosToLocation(userId, locationId, [
                { buffer: Buffer.from('one'), filename: 'one.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma, labelDetector: async () => [] }))

            // Assert
            expect(photos).toHaveLength(1)
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.keywords).toEqual(['brick'])
        })

        it('should cap the location at 15 keywords', async () => {
            // Arrange
            const manyLabels = Array.from({ length: 20 }, (_, i) => `label-${i}`)

            // Act
            expectSuccess(await addPhotosToLocation(userId, locationId, [
                { buffer: Buffer.from('one'), filename: 'one.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma, labelDetector: async () => manyLabels }))

            // Assert
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.keywords).toHaveLength(15)
            expect(location!.keywords[0]).toBe('brick')
        })
    })

    describe('updatePhoto', async() => {
        let locationId: string
        let photoId: string
        beforeEach(async () => {
            const createdLocation = expectSuccess(await createLocation(userId, buildLocationInput(), { db : prisma }))
            locationId = createdLocation.id

            const photoInput = [{
                locationId: locationId,
                buffer: Buffer.from('fake image data'),
                filename: 'alley.jpg',
                name: 'Alley',
                mimeType: 'image/jpeg'
            }]

            const result = expectSuccess(await addPhotosToLocation(userId, locationId, photoInput, { db : prisma }))
            photoId = result[0].id
        })

        it('should be able to update photo name', async() => {
            // Arrange
            const name = 'Downtown Alley'
            const updateInput = { name: name }

            // Act
            const result = expectSuccess(await updatePhoto(userId, photoId, updateInput, { db : prisma }))

            // Assert
            expect(result.name).toBe(name)
        })

        it('should return NOT_FOUND for a photo that does not exist', async () => {
            // Act
            const result = expectFailure(await updatePhoto(userId, 'nonexistent-photo-id', { name: 'x' }, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })

    describe('removePhotosFromLocation', () => {
        it('should remove only the specified photos', async () => {
            // Arrange
            const location = expectSuccess(await createLocation(userId, buildLocationInput(), { db: prisma }))
            const photos = expectSuccess(await addPhotosToLocation(userId, location.id, [
                { buffer: Buffer.from('photo1'), filename: 'first.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo2'), filename: 'second.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma }))

            // Act
            expectSuccess(await removePhotosFromLocation(userId, location.id, [photos[0].id], { db: prisma }))

            // Assert
            const remaining = await prisma.photo.findMany({ where: { locationId: location.id } })
            expect(remaining).toHaveLength(1)
            expect(remaining[0].id).toBe(photos[1].id)
        })

        it('should delete the removed photos\' files from storage', async () => {
            // Arrange
            const location = expectSuccess(await createLocation(userId, buildLocationInput(), { db: prisma }))
            const photos = expectSuccess(await addPhotosToLocation(userId, location.id, [
                { buffer: Buffer.from('photo1'), filename: 'first.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo2'), filename: 'second.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma }))

            // Act
            expectSuccess(await removePhotosFromLocation(userId, location.id, [photos[0].id], { db: prisma }))

            // Assert
            expect(await listTestBucket()).toEqual([photos[1].storageKey])
        })
    })

    describe('updatePhotoDisplayOrder', async() => {
        it('should reorder photos for a location', async () => {
            // Arrange - Create location with photos
            const location = expectSuccess(await createLocation(userId, buildLocationInput(), { db: prisma }))

            const photos = [
                { buffer: Buffer.from('photo1'), filename: 'first.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo2'), filename: 'second.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo3'), filename: 'third.jpg', mimeType: 'image/jpeg' },
            ]

            const added = expectSuccess(await addPhotosToLocation(userId, location.id, photos, { db: prisma }))

            // Original order: first=0, second=1, third=2
            // New order: third, first, second
            const reordered = [
                added[2].id,
                added[0].id,
                added[1].id,
            ]

            // Act
            expectSuccess(await updatePhotoDisplayOrder(userId, location.id, reordered, { db: prisma }))

            // Assert
            const updated = await prisma.photo.findMany({
                where: { locationId: location.id },
                orderBy: { displayOrder: 'asc' }
            })

            expect(updated[0].name).toBe('third.jpg')
            expect(updated[0].displayOrder).toBe(0)
            expect(updated[1].name).toBe('first.jpg')
            expect(updated[1].displayOrder).toBe(1)
            expect(updated[2].name).toBe('second.jpg')
            expect(updated[2].displayOrder).toBe(2)
        })

        it('should fail if a photo does not belong to the location', async () => {
            // Arrange - Create two locations, each with a photo
            const locationA = expectSuccess(await createLocation(userId, buildLocationInput({ name: 'Location A' }), { db: prisma }))
            const locationB = expectSuccess(await createLocation(userId, buildLocationInput({
                name: 'Location B',
                address: '456 Other St',
                postalCode: 'M5V 2B2'
            }), { db: prisma }))

            const photoA = expectSuccess(await addPhotosToLocation(userId, locationA.id, [
                { buffer: Buffer.from('photoA'), filename: 'a.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma }))

            const photoB = expectSuccess(await addPhotosToLocation(userId, locationB.id, [
                { buffer: Buffer.from('photoB'), filename: 'b.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma }))

            // Act - Try to reorder location A's photos but sneak in location B's photo
            const result = await updatePhotoDisplayOrder(userId, locationA.id, [
                photoA[0].id,
                photoB[0].id,
            ], { db: prisma })

            // Assert
            expect(result.success).toBe(false)
        })

        it('should rollback all changes if any photo fails validation', async () => {
            // Arrange
            const location = expectSuccess(await createLocation(userId, buildLocationInput({ name: 'Rollback Test' }), { db: prisma }))

            const added = expectSuccess(await addPhotosToLocation(userId, location.id, [
                { buffer: Buffer.from('photo1'), filename: 'first.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo2'), filename: 'second.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma }))

            const originalOrder = await prisma.photo.findMany({
                where: { locationId: location.id },
                orderBy: { displayOrder: 'asc' }
            })

            // Act - Valid photo followed by a fake ID
            const result = await updatePhotoDisplayOrder(userId, location.id, [
                added[1].id,
                'nonexistent-photo-id',
            ], { db: prisma })

            // Assert - Order unchanged
            expect(result.success).toBe(false)

            const afterAttempt = await prisma.photo.findMany({
                where: { locationId: location.id },
                orderBy: { displayOrder: 'asc' }
            })

            expect(afterAttempt[0].id).toBe(originalOrder[0].id)
            expect(afterAttempt[0].displayOrder).toBe(originalOrder[0].displayOrder)
            expect(afterAttempt[1].id).toBe(originalOrder[1].id)
            expect(afterAttempt[1].displayOrder).toBe(originalOrder[1].displayOrder)
        })
    })

    describe('User isolation', () => {
        let ownerId: string
        let intruderId: string
        let locationId: string
        let photoIds: string[]

        beforeEach(async () => {
            // Arrange - owner has a location with two photos; intruder is a separate user
            ownerId = userId
            intruderId = (await signUpSetup()).userId

            const location = expectSuccess(await createLocation(ownerId, buildLocationInput(), { db: prisma }))
            locationId = location.id

            const photos = expectSuccess(await addPhotosToLocation(ownerId, locationId, [
                { buffer: Buffer.from('photo1'), filename: 'first.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo2'), filename: 'second.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma }))
            photoIds = photos.map(p => p.id)
        })

        it('should not allow another user to add photos to a location they do not own', async () => {
            // Act
            const result = expectFailure(await addPhotosToLocation(intruderId, locationId, [
                { buffer: Buffer.from('intruder'), filename: 'intruder.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const photos = await prisma.photo.findMany({ where: { locationId } })
            expect(photos).toHaveLength(2)
        })

        it('should not allow another user to remove specific photos from a location they do not own', async () => {
            // Act
            const result = expectFailure(await removePhotosFromLocation(intruderId, locationId, [photoIds[0]], { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const photos = await prisma.photo.findMany({ where: { locationId } })
            expect(photos).toHaveLength(2)
        })

        it('should not allow another user to remove all photos from a location they do not own', async () => {
            // Act
            const result = expectFailure(await removePhotosFromLocation(intruderId, locationId, [], { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const photos = await prisma.photo.findMany({ where: { locationId } })
            expect(photos).toHaveLength(2)
        })

        it('should not allow another user to rename a photo they do not own', async () => {
            // Act
            const result = expectFailure(await updatePhoto(intruderId, photoIds[0], { name: 'Hijacked' }, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const photo = await prisma.photo.findUnique({ where: { id: photoIds[0] } })
            expect(photo!.name).toBe('first.jpg')
        })

        it('should not allow another user to reorder photos on a location they do not own', async () => {
            // Arrange
            const originalOrder = await prisma.photo.findMany({
                where: { locationId },
                orderBy: { displayOrder: 'asc' }
            })

            // Act
            const result = expectFailure(await updatePhotoDisplayOrder(intruderId, locationId, [...photoIds].reverse(), { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const afterAttempt = await prisma.photo.findMany({
                where: { locationId },
                orderBy: { displayOrder: 'asc' }
            })
            expect(afterAttempt.map(p => p.id)).toEqual(originalOrder.map(p => p.id))
        })

        it('should not allow a user to move their own photo ordering onto another user\'s photos', async () => {
            // Arrange - intruder owns their own location with a photo
            const intruderLocation = expectSuccess(await createLocation(intruderId, buildLocationInput({ name: 'Intruder Spot' }), { db: prisma }))
            const intruderPhotos = expectSuccess(await addPhotosToLocation(intruderId, intruderLocation.id, [
                { buffer: Buffer.from('mine'), filename: 'mine.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma }))

            // Act - intruder passes their own location, but sneaks in the owner's photo id
            const result = await updatePhotoDisplayOrder(intruderId, intruderLocation.id, [
                intruderPhotos[0].id,
                photoIds[0],
            ], { db: prisma })

            // Assert
            expect(result.success).toBe(false)
            const ownerPhoto = await prisma.photo.findUnique({ where: { id: photoIds[0] } })
            expect(ownerPhoto!.displayOrder).toBe(0)
        })
    })
})
