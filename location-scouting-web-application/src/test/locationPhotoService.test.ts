import {beforeEach, describe, expect, it } from 'vitest'
import {createLocation} from "@/app/services/locationService";
import {prisma} from "@/test/setup";
import {addPhotosToLocation, updatePhoto, updatePhotoDisplayOrder} from "@/app/services/locationPhotoService";

describe('Location Photo Service', () => {
    describe('addPhotosToLocation', async() => {

        let locationId: string

        beforeEach(async () => {
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const createdLocation = await createLocation( locationInput, { db : prisma })
            expect(createdLocation).toBeDefined()
            expect(createdLocation).not.toBeNull()
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
            const result = await addPhotosToLocation(locationId, photoInput, { db: prisma })

            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data).not.toBeNull()
                expect(result.data).toHaveLength(2)
                expect(result.data[0].name).toBe('alley.jpg')
                expect(result.data[1].name).toBe('alley2.jpg')
                expect(result.data[0].locationId).toBe(locationId)
                expect(result.data[1].locationId).toBe(locationId)
            }
        })

        it('Should set custom names for a photo when specified', async() => {
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
            const result = await addPhotosToLocation(locationId, photoInput, { db : prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data).not.toBeNull()
                expect(result.data).toHaveLength(2)
                expect(result.data[0].name).toBe(firstPhotoName)
                expect(result.data[1].name).toBe(lastPhotoName)
                expect(result.data[0].locationId).toBe(locationId)
                expect(result.data[1].locationId).toBe(locationId)
            }
        })

        it('Should not upload more than 500 photos', () => {

        })
        it('Should associate uploaded photos with the correct location', () => {})
        it('Should not associate photos with an archived (marked as deleted) location', () => {})
        it('')
    })
    describe('updatePhoto', async() => {
        let locationId: string
        let photoId: string
        beforeEach(async () => {
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const createdLocation = await createLocation( locationInput, { db : prisma })
            expect(createdLocation).toBeDefined()
            expect(createdLocation).not.toBeNull()
            expect(createdLocation.id).not.toBeNull()
            locationId = createdLocation.id

            const photoInput = [{
                locationId: locationId,
                buffer: Buffer.from('fake image data'),
                filename: 'alley.jpg',
                name: 'Alley',
                mimeType: 'image/jpeg'
            }]

            const result = await addPhotosToLocation(locationId, photoInput, { db : prisma })
            if(result.success) {
                photoId = result.data[0].id
            }
        })

        it('should be able to update photo name', async() => {
            // Arrange
            const name = 'Downtown Alley'
            const updateInput = { name: name }

            // Act
            const result = await updatePhoto(photoId, updateInput, { db : prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data.name).toBe(name)
            }
        })
    })

    describe('updatePhotoDisplayOrder', async() => {
        it('should reorder photos for a location', async () => {
            // Arrange - Create location with photos
            const location = await createLocation({
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }, { db: prisma })

            const photos = [
                { buffer: Buffer.from('photo1'), filename: 'first.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo2'), filename: 'second.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo3'), filename: 'third.jpg', mimeType: 'image/jpeg' },
            ]

            const addResult = await addPhotosToLocation(location.id, photos, { db: prisma })
            expect(addResult.success).toBe(true)
            if (!addResult.success) return

            // Original order: first=0, second=1, third=2
            // New order: third, first, second
            const reordered = [
                addResult.data[2].id,
                addResult.data[0].id,
                addResult.data[1].id,
            ]

            // Act
            const result = await updatePhotoDisplayOrder(location.id, reordered, { db: prisma })

            // Assert
            expect(result.success).toBe(true)

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
            const locationA = await createLocation({
                name: 'Location A',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }, { db: prisma })

            const locationB = await createLocation({
                name: 'Location B',
                address: '456 Other St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 2B2'
            }, { db: prisma })

            const photoA = await addPhotosToLocation(locationA.id, [
                { buffer: Buffer.from('photoA'), filename: 'a.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma })

            const photoB = await addPhotosToLocation(locationB.id, [
                { buffer: Buffer.from('photoB'), filename: 'b.jpg', mimeType: 'image/jpeg' }
            ], { db: prisma })

            expect(photoA.success).toBe(true)
            expect(photoB.success).toBe(true)
            if (!photoA.success || !photoB.success) return

            // Act - Try to reorder location A's photos but sneak in location B's photo
            const result = await updatePhotoDisplayOrder(locationA.id, [
                photoA.data[0].id,
                photoB.data[0].id,
            ], { db: prisma })

            // Assert
            expect(result.success).toBe(false)
        })

        it('should rollback all changes if any photo fails validation', async () => {
            // Arrange
            const location = await createLocation({
                name: 'Rollback Test',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }, { db: prisma })

            const addResult = await addPhotosToLocation(location.id, [
                { buffer: Buffer.from('photo1'), filename: 'first.jpg', mimeType: 'image/jpeg' },
                { buffer: Buffer.from('photo2'), filename: 'second.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma })

            expect(addResult.success).toBe(true)
            if (!addResult.success) return

            const originalOrder = await prisma.photo.findMany({
                where: { locationId: location.id },
                orderBy: { displayOrder: 'asc' }
            })

            // Act - Valid photo followed by a fake ID
            const result = await updatePhotoDisplayOrder(location.id, [
                addResult.data[1].id,
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
})