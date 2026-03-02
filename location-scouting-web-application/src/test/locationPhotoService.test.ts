import {describe, expect, it, test, vi} from 'vitest'
import {createLocation} from "@/app/services/locationService";
import {prisma} from "@/test/setup";
import {addPhotosToLocation} from "@/app/services/locationPhotoService";

describe('Location Photo Service', () => {
    describe('addPhotosToLocation', () => {
        it('Should be able to upload location photos', async () => {
            // Arrange - Create a location
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const createdLocation = await createLocation( locationInput, { db : prisma })

            // Photo upload input
            const photoInput = [{
                    locationId: createdLocation.id,
                    buffer: Buffer.from('fake image data'),
                    filename: 'alley.jpg',
                    mimeType: 'image/jpeg'
                },
                {
                    locationId: createdLocation.id,
                    buffer: Buffer.from('another fake image'),
                    filename: 'alley2.jpg',
                    mimeType: 'image/jpeg'
                }]

            // Act - Upload photos to the location
            const result = await addPhotosToLocation(createdLocation.id, photoInput, { db: prisma })

            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data).not.toBeNull()
                expect(result.data).toHaveLength(2)
                expect(result.data[0].name).toBe('alley.jpg')
                expect(result.data[1].name).toBe('alley2.jpg')
                expect(result.data[0].locationId).toBe(createdLocation.id)
                expect(result.data[1].locationId).toBe(createdLocation.id)
            }
        })

        it('Should not upload more than 500 photos', () => {

        })
        it('Should associate uploaded photos with the correct location', () => {})
        it('Should not associate photos with an archived (marked as deleted) location', () => {})
        it('')
    })

    it('should do true', () => {
        console.log("This is a test placeholder for locationPhotoService tests. Please implement actual tests here.")
        expect(true).toBe(true)
    })
})