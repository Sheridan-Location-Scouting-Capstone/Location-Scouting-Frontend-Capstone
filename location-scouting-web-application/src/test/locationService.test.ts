import {beforeEach, describe, expect, it, test, vi} from 'vitest'
import {
    createLocation,
    deleteLocationById,
    getLocationById, getLocations,
    getLocationWithPhotos,
    updateLocation
} from "@/app/services/locationService";
import {prisma} from '@/test/setup'
import {Geocoder} from "@/app/schemas/geocoder";
import {addPhotosToLocation} from "@/app/services/locationPhotoService";
// @ts-ignore
import { LocationStatus } from "@prisma/client";
describe('Location Services', () => {
    describe('createLocation', () => {
        it('should save a location with minimum required fields and return it with an id', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            // Act
            const result = await createLocation(locationInput, {db: prisma});

            // Assert
            expect(result.id).toBeDefined()
            expect(result.id).not.toBeNull()
            expect(result.name).toBe('Downtown Alley')
            expect(result.country).toBe('Canada') // Verify default value applied
            expect(result.status).toBe('ACTIVE')  // Verify default value applied
            expect(result.createdAt).not.toBeNull()
            expect(result.updatedAt).not.toBeNull()
        })

        test.each([
            ['empty postal code', {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: ''
            }],
            ['empty province', {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: '',
                postalCode: 'M5V 1A1'
            }],
            ['empty city', {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: '',
                province: '',
                postalCode: 'M5V 1A1'
            }],
            ['empty name', {name: '', address: '123 Main St', city: 'Toronto', province: '', postalCode: 'M5V 1A1'}],
            ['empty address', {
                name: 'Downtown Alley',
                address: '',
                city: 'Toronto',
                province: '',
                postalCode: 'M5V 1A1'
            }],
        ])('should throw an error when there is an %s', async function (description, input) {
            await expect(() => createLocation(input, {db: prisma})).rejects.toThrow()
        })

        it('should assign a unique ID to the location', async () => {
        })
        it('should geocode an address on creation', async () => {
        })
        it('')
        test.each([
            '(705) 773 3685',
            '705 773 3685',
            '(705)7733685',
            '(905)1124235',
            '(705)-773-3685',
            '705-773-3685'
        ])('should accept various phone numbers formats', async (input) => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1',
                contactPhone: input
            }

            // Act
            const result = await createLocation(locationInput, {db: prisma});

            // Assert
            expect(result.contactPhone).toBeDefined()
            expect(result.contactPhone).not.toBeNull()
        })

        test.each([
            '1',
            'ASDF',
            'INVALID INPUT',
            'M1XeD InpUt',
            '12312315353555542341523',
            '()()()()()()()()()()()(242'
        ])('should reject invalid phone numbers', async (input) => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1',
                contactPhone: input
            }

            // Act & Assert (Expected Error)
            await expect(createLocation(locationInput, {db: prisma})).rejects.toThrow();
        })

        test.each([
            'J', // 1 char
            'A1', // 2 char
            'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. TheG', // 69 char
            'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The G' // 70 char
        ])('should accept contact names with between 1 and 70 characters long (boundary-value analysis)', async (input) => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1',
                contactName: input
            }

            // Act
            const result = await createLocation(locationInput, {db: prisma});

            // Assert
            expect(result.contactName).not.toBeNull()
            expect(result.contactName).toEqual(input)
        })

        test.each([
            '', // 0 char
            'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The Gr', // 71 char
            'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The Gre' // 72 char
        ])('should reject invalid contact names (boundary value analysis)', async (input) => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1',
                contactName: input
            }

            // Act
            const result = createLocation(locationInput, {db: prisma});

            // Assert
            await expect(result).rejects.toThrow();
        })

        it('should geocode an address on location creation', async () => {
            // Arrange
            const mockGeocoder: Geocoder = async () => ({lat: 43.6532, lng: -79.3832})
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            // Act
            const result = await createLocation(locationInput, {db: prisma, geocoder: mockGeocoder});
            expect(result.id).toBeDefined()

            // Assert
            await vi.waitFor(async () => {
                const savedLocation = await prisma.location.findFirst({where: {id: result.id}});
                expect(savedLocation!.latitude).not.toBeNull()
                expect(savedLocation!.longitude).not.toBeNull()
                console.log(savedLocation)
            })
        })

        it.skip('INTEGRATION: should geocode a real address via Nominatim', async () => {
            // Arrange
            const locationInput = {
                name: 'CN Tower',
                address: '290 Bremner Blvd',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 3L9'
            }

            // Act
            const result = await createLocation(locationInput, {db: prisma})

            // Assert
            await vi.waitFor(async () => {
                const savedLocation = await prisma.location.findFirst({where: {id: result.id}})
                expect(savedLocation!.latitude).not.toBeNull()
                expect(savedLocation!.longitude).not.toBeNull()
                console.log(savedLocation)
            }, {timeout: 10000}) // give it 10 seconds for the real network call
        })

        test('Location should save regardless of geocoding success or failure', async () => {
            // Arrange
            const mockGeocoder: Geocoder = async () => null
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            // Act
            const result = await createLocation(locationInput, {db: prisma, geocoder: mockGeocoder});
            expect(result.id).toBeDefined()

            // Assert
            await vi.waitFor(async () => {
                const savedLocation = await prisma.location.findFirst({where: {id: result.id}});
                expect(savedLocation!.latitude).toBeNull()
                expect(savedLocation!.longitude).toBeNull()
                console.log(savedLocation)
            }, {timeout: 10000})
        })

        test('Location should save regardless of geocoding error', async () => {
            // Arrange
            const mockGeocoder: Geocoder = async () => {
                throw new Error('Network error')
            }
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            // Act
            const result = await createLocation(locationInput, {db: prisma, geocoder: mockGeocoder});
            expect(result.id).toBeDefined()

            // Assert
            await vi.waitFor(async () => {
                const savedLocation = await prisma.location.findFirst({where: {id: result.id}});
                expect(savedLocation!.latitude).toBeNull()
                expect(savedLocation!.longitude).toBeNull()
                console.log(savedLocation)
            }, {timeout: 10000})
        })

        test('Location photos save successfully when creating a new location', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const photoInput = [{
                buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
            }]

            // Act
            const result = await createLocation(locationInput, {db: prisma, photoInput: photoInput});


            // Assert
            await vi.waitFor(async () => {
                const photos = await prisma.photo.findMany({where: {locationId: result.id}})
                expect(photos).not.toBeNull()
                expect(photos).toHaveLength(1)
            })
        })

        it('should reject photo uploads with more than 500 photos', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const photoInput = []
            for (let i = 0; i < 501; i++) {
                photoInput.push({
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: `test${i}.jpg`,
                    mimeType: 'image/jpeg',
                })
            }

            // Act
            const result = createLocation(locationInput, {db: prisma, photoInput: photoInput});

            // Assert
            await expect(result).rejects.toThrow()
        }, 20000)
    })


    describe('getLocation', () => {
        it('should retrieve a location by id', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const createdLocation = await createLocation(locationInput, {db: prisma});
            expect(createdLocation.id).toBeDefined()
            expect(createdLocation.id).not.toBeNull()

            // Act
            const result = await getLocationById(createdLocation.id, {db: prisma})

            // Assert
            expect(result).not.toBeNull()
            expect(result!.id).toBe(createdLocation.id)
            expect(result!.name).toBe(locationInput.name)
            expect(result!.address).toBe(locationInput.address)
            expect(result!.city).toBe(locationInput.city)
            expect(result!.province).toBe(locationInput.province)
            expect(result!.postalCode).toBe(locationInput.postalCode)
        })

        it('should return null if location with given id does not exist', async () => {
            // Arrange
            const nonExistentId = '9999'

            // Act
            const result = await getLocationById(nonExistentId, {db: prisma})

            // Assert
            expect(result).toBeNull()
        })
    })

    describe('getLocationWithPhotos', () => {
        it('should retrieve a location along with its associated photos', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const photoInput = [{
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test.jpg',
                    mimeType: 'image/jpeg',
                },
                {
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test2.jpg',
                    mimeType: 'image/jpeg',
                }]

            const createdLocation = await createLocation(locationInput, {db: prisma, photoInput: photoInput});
            expect(createdLocation.id).toBeDefined()
            expect(createdLocation.id).not.toBeNull()

            // Act
            const result = await getLocationWithPhotos(createdLocation.id, {db: prisma})

            // Assert
            expect(result).not.toBeNull()
            expect(result!.id).toBe(createdLocation.id)
            expect(result!.photos).toHaveLength(2)
            expect(result!.photos[0].name).toBe('test.jpg')
            expect(result!.photos[1].name).toBe('test2.jpg')
            expect(result!.photos[0].url).toBeDefined()
            expect(result!.photos[1].url).toBeDefined()
            expect(result!.photos[0].locationId).toBe(createdLocation.id)
            expect(result!.photos[1].locationId).toBe(createdLocation.id)
        })

        it('should return an empty photos array if location has no associated photos', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const createdLocation = await createLocation(locationInput, {db: prisma});
            expect(createdLocation.id).toBeDefined()
            expect(createdLocation.id).not.toBeNull()

            // Act
            const result = await getLocationWithPhotos(createdLocation.id, {db: prisma})

            // Assert
            expect(result).not.toBeNull()
            expect(result!.id).toBe(createdLocation.id)
            expect(result!.photos).toHaveLength(0)
        })
    })

    describe('updateLocation', () => {

        let locationId: string

        beforeEach(async() => {
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const result = await createLocation(locationInput, { db: prisma })
            locationId = result.id;
        })

        it('should update partial location details and return the updated record', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const createdLocation = await createLocation(locationInput, {db: prisma})

            // Act
            const updatedData = {
                name: 'Updated Alley',
                city: 'Ottawa'
            }
            const result = await updateLocation(createdLocation.id, updatedData, {db: prisma})

            // Assert
            expect(result).not.toBeNull()
            expect(result!.id).toBe(createdLocation.id)
            expect(result!.name).toBe(updatedData.name)
            expect(result!.city).toBe(updatedData.city)
            expect(result!.address).toBe(locationInput.address) // unchanged
            expect(result!.province).toBe(locationInput.province) // unchanged
            expect(result!.postalCode).toBe(locationInput.postalCode) // unchanged
            expect(result!.updatedAt.getTime()).toBeGreaterThan(createdLocation.updatedAt.getTime()) // updatedAt should be more recent than createdAt
        })

        test.each([
            '', // 0 char
            'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The Gr', // 71 char
            'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The Gre' // 72 char
        ])('should reject invalid contact names (boundary value analysis)', async (input) => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1',
                contactName: input
            }

            // Act & Assert
            await expect(updateLocation(locationId, locationInput, { db: prisma })).rejects.toThrow();
        })
    })

    describe('updateLocationStatus', () => {
        it('should update the status of a location', async () => {
                // Arrange
                const locationInput = {
                    name: 'Downtown Alley',
                    address: '123 Main St',
                    city: 'Toronto',
                    province: 'ON',
                    postalCode: 'M5V 1A1'
                }

                const createdLocation = await createLocation(locationInput, { db: prisma })

                // Act
                const updatedData = {
                    status: LocationStatus.ARCHIVED
                }
                const result = await updateLocation(createdLocation.id, updatedData, {db: prisma})

                // Assert
                expect(result).not.toBeNull()
                expect(result!.id).toBe(createdLocation.id)
                expect(result!.status).toBe(LocationStatus.ARCHIVED)
        })
    })

    describe('deleteLocation', () => {
        it('should mark a location as deleted without actually removing it from the database', async () => {
            // Arrange
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            // Act
            const createdLocation = await createLocation(locationInput, {db: prisma})
            await deleteLocationById(createdLocation.id, {db: prisma})
            const deletedLocation = await prisma.location.findFirst({
                where: {id: createdLocation.id}
            })

            // Assert
            expect(deletedLocation).not.toBeNull()
            expect(deletedLocation!.id).toBe(createdLocation.id)
            expect(deletedLocation!.status).toBe('DELETED')
        })

        it('should not delete associated photos when a location is deleted', async () => {
            // Arrange - Create Location
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }
            const createdLocation = await createLocation(locationInput, {db: prisma})

            // Arrange - Add Photos to Location
            const photoInput = [{
                    locationId: createdLocation.id,
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test.jpg',
                    mimeType: 'image/jpeg',
                },
                {
                    locationId: createdLocation.id,
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test2.jpg',
                    mimeType: 'image/jpeg',
                }]

            const numOfPhotos = photoInput.length

            const addedPhotosResult = await addPhotosToLocation(createdLocation.id, photoInput, {db: prisma})
            expect(addedPhotosResult.success).toBe(true)
            if(addedPhotosResult.success){
                expect(addedPhotosResult.data).toHaveLength(numOfPhotos)
            }

            // Verify photos were added before proceeding with delete test (Soft Assert)
            const createdLocationWithPhotos = await getLocationWithPhotos(createdLocation.id, {db: prisma})
            expect(createdLocationWithPhotos).not.toBeNull()
            expect(createdLocationWithPhotos!.photos).toHaveLength(numOfPhotos)


            // Act
            await deleteLocationById(createdLocation.id, {db: prisma})
            const associatedPhotos = await prisma.photo.findMany({
                where: {locationId: createdLocation.id}
            })

            // Assert
            expect(associatedPhotos).toHaveLength(numOfPhotos);
        })


    })

    describe('getLocations', () => {
        it('should get all locations not marked with the DELETED status', async () => {
            // Arrange
            // Prepare test data with a mix of ACTIVE and DELETED locations
            const activeLocationInput = {
                name: 'Active Location',
                address: '123 Active St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            const secondActiveLocationInput = {
                name: 'Second Active Location',
                address: '789 Active Ave',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 3C3'
            }
            const deletedLocationInput = {
                name: 'Deleted Location',
                address: '456 Deleted Ave',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 2B2'
            }

            createLocation(activeLocationInput, {db: prisma})
            createLocation(secondActiveLocationInput, {db: prisma})
            const deletedLocation = await createLocation(deletedLocationInput, {db: prisma})

            await deleteLocationById(deletedLocation.id, {db: prisma})

            // Act
            const results = await getLocations({db: prisma})

            // Assert
            expect(results).toHaveLength(2)
            const locationNames = results.map((loc: { name: any; }) => loc.name)
            expect(locationNames).toContain(activeLocationInput.name)
            expect(locationNames).toContain(secondActiveLocationInput.name)
            expect(locationNames).not.toContain(deletedLocation)
        })
    })


})