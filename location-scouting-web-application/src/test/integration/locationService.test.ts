import {beforeEach, describe, expect, it, test, vi} from 'vitest'
import {
    createLocation,
    deleteLocationById,
    getLocationById, getLocations,
    getLocationWithPhotos,
    updateLocation
} from "@/services/locationService";
import {prisma} from '@/test/setup'
import {Geocoder} from "@/schemas/geocoder";
import {addPhotosToLocation} from "@/services/locationPhotoService";
// @ts-ignore
import { LocationStatus } from "@prisma/client";
import {signUpSetup} from "@/test/e2e/fixtures";
import {expectFailure, expectSuccess} from "@/test/helpers/result";
import {User} from "better-auth";
import {ErrorCode} from "@/schemas/result";

function buildLocationInput({
    name = 'Downtown Alley',
    address = '123 Main St',
    city = 'Toronto',
    province = 'ON',
    postalCode = 'M5V 1A1',
    contactName = undefined as string | undefined,
    contactPhone = undefined as string | undefined,
} = {}) {
    return {name, address, city, province, postalCode, contactName, contactPhone }
}



describe('Location Services', () => {
    describe('createLocation', () => {
        it('should save a location with minimum required fields and return it with an id', async () => {
            // Arrange
            const user = await signUpSetup();
            const locationInput = buildLocationInput();

            // Act
            const result = await createLocation(user.userId, locationInput, {db: prisma});

            // Assert
            expect(result).toBeDefined()
            expect(result.success).toBe(true)
            if(!result.success) {
                throw new Error('Location creation failed')
            }

            const data = result.data

            expect(data.id).toBeDefined()
            expect(data.id).not.toBeNull()
            expect(data.userId).toBe(user.userId)
            expect(data.name).toBe('Downtown Alley')
            expect(data.country).toBe('Canada') // Verify default value applied
            expect(data.status).toBe('ACTIVE')  // Verify default value applied
            expect(data.createdAt.getDate()).toBe(new Date().getDate()) // Verify createdAt is set to today
            expect(data.updatedAt.getDate()).toBe(new Date().getDate()) // Verify updatedAt is set to today
        })

        const UNUSED_USER_ID = 'validation-fails-before-db-access'
        test.each([
            ['empty postal code', buildLocationInput({postalCode: ''})],
            ['empty province', buildLocationInput({province: ''})],
            ['empty city', buildLocationInput({city: ''})],
            ['empty name', buildLocationInput({name: ''})],
            ['empty address', buildLocationInput({address: ''})],
        ])('should fail to create a location when there is an %s', async function (description: string, input: any) {
            const result = expectFailure(await createLocation(UNUSED_USER_ID, input, {db: prisma}))
            expect(result.success).toBe(false)
            expect(result.code).toBe('VALIDATION_FAILED')
            expect(result.error).toBeDefined()
            expect(result.fieldErrors).toBeDefined()
        })

        it('should assign a unique ID to the location', async () => {
        })
        it('should geocode an address on creation', async () => {
        })
        it('')
        describe('contact phone number validation', () => {
            let user: any

            beforeEach(async () => {
                user = await signUpSetup()
            })

            test.each([
                { input: '(705) 773 3685', expected: '7057733685' },
                { input: '705 773 3685', expected: '7057733685' },
                { input: '(705)7733685', expected: '7057733685' },
                { input: '(905)1124235', expected: '9051124235' },
                { input: '(705)-773-3685', expected: '7057733685' },
                { input: '705-773-3685', expected: '7057733685' }
            ])('should accept various phone numbers formats', async ({ input, expected }) => {
                // Arrange
                const locationInput = buildLocationInput({contactPhone: input})

                // Act
                const result = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}));

                // Assert
                expect(result.contactPhone).toBeDefined()
                expect(result.contactPhone).not.toBeNull()
                expect(result.contactPhone).toBe(expected)
            })
        })

        describe('contact info validation', () => {

            let user: any

            beforeEach(async () => {
                user = await signUpSetup()
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
                const locationInput = buildLocationInput({contactPhone: input})

                // Act
                const result = expectFailure(await createLocation(user.userId, locationInput, {db: prisma}));

                // Assert
                expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            })

            test.each([
                'J', // 1 char
                'A1', // 2 char
                'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. TheG', // 69 char
                'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The G' // 70 char
            ])('should accept contact names with between 1 and 70 characters long (boundary-value analysis)', async (input) => {
                // Arrange
                const locationInput = buildLocationInput({contactName: input})

                // Act
                const result = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}));

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
                const locationInput = buildLocationInput({contactName: input})

                // Act
                const result = expectFailure(await createLocation(user.userId, locationInput, {db: prisma}));

                // Assert
                expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            })
        })


        describe('geocoding', () => {

            it('should geocode an address on location creation', async () => {
                // Arrange
                const user = await signUpSetup();
                const mockGeocoder: Geocoder = async () => ({lat: 43.6532, lng: -79.3832})
                const locationInput = buildLocationInput();

                // Act
                const result = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma, geocoder: mockGeocoder}));
                expect(result.id).toBeDefined()

                // Assert
                await vi.waitFor(async () => {
                    const savedLocation = await prisma.location.findFirst({where: {id: result.id}});
                    expect(savedLocation!.latitude).not.toBeNull()
                    expect(savedLocation!.longitude).not.toBeNull()

                })
            })

            it.skip('INTEGRATION: should geocode a real address via Nominatim', async () => {
                // Arrange
                const user = await signUpSetup();
                const locationInput = {
                    name: 'CN Tower',
                    address: '290 Bremner Blvd',
                    city: 'Toronto',
                    province: 'ON',
                    postalCode: 'M5V 3L9'
                }

                // Act
                const result = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}));

                // Assert
                await vi.waitFor(async () => {
                    const savedLocation = await prisma.location.findFirst({where: {id: result.id}})
                    expect(savedLocation!.latitude).not.toBeNull()
                    expect(savedLocation!.longitude).not.toBeNull()

                }, {timeout: 10000}) // give it 10 seconds for the real network call
            })

            test('Location should save regardless of geocoding success or failure', async () => {
                // Arrange
                const mockGeocoder: Geocoder = async () => null
                const locationInput = buildLocationInput()
                const user = await signUpSetup()

                // Act
                const result = expectSuccess(await createLocation(user.userId, locationInput, {
                    db: prisma,
                    geocoder: mockGeocoder
                }));
                expect(result.id).toBeDefined()

                // Assert
                await vi.waitFor(async () => {
                    const savedLocation = await prisma.location.findFirst({where: {id: result.id}});
                    expect(savedLocation!.latitude).toBeNull()
                    expect(savedLocation!.longitude).toBeNull()
                }, {timeout: 10000})
            })
        })

        test('Location should save regardless of geocoding error', async () => {
            // Arrange
            const testUser = await signUpSetup()
            const mockGeocoder: Geocoder = async () => {
                throw new Error('Network error')
            }
            const locationInput = buildLocationInput()

            // Act
            const result = expectSuccess(await createLocation(testUser.userId, locationInput, {db: prisma, geocoder: mockGeocoder}));
            expect(result.id).toBeDefined()

            // Assert
            await vi.waitFor(async () => {
                const savedLocation = await prisma.location.findFirst({where: {id: result.id}});
                expect(savedLocation!.latitude).toBeNull()
                expect(savedLocation!.longitude).toBeNull()

            }, {timeout: 10000})
        })

        test('Location photos save successfully when creating a new location', async () => {
            // Arrange
            const locationInput = buildLocationInput()
            const user = await signUpSetup()

            const photoInput = [{
                buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
            }]

            // Act
            const result = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma, photoInput: photoInput}));


            // Assert
            await vi.waitFor(async () => {
                const photos = await prisma.photo.findMany({where: {locationId: result.id}})
                expect(photos).not.toBeNull()
                expect(photos).toHaveLength(1)
            })
        })

        it('should reject photo uploads with more than 500 photos', async () => {
            // Arrange
            const locationInput = buildLocationInput()
            const user = await signUpSetup()

            const photoInput = []
            for (let i = 0; i < 501; i++) {
                photoInput.push({
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: `test${i}.jpg`,
                    mimeType: 'image/jpeg',
                })
            }

            // Act
            const result = expectFailure(await createLocation(user.userId, locationInput, {db: prisma, photoInput: photoInput}));

            // Assert
            await expect(result.success).toBe(false)
            await expect(result.code).toBe('LIMIT_EXCEEDED')
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

            const user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}));
            expect(createdLocation.id).toBeDefined()
            expect(createdLocation.id).not.toBeNull()

            // Act
            const result = expectSuccess(await getLocationById(user.userId, createdLocation.id, {db: prisma}))

            // Assert
            expect(result.id).toBe(createdLocation.id)
            expect(result.name).toBe(locationInput.name)
            expect(result.address).toBe(locationInput.address)
            expect(result.city).toBe(locationInput.city)
            expect(result.province).toBe(locationInput.province)
            expect(result.postalCode).toBe(locationInput.postalCode)
        })

        it('should return null if location with given id does not exist', async () => {
            // Arrange
            const nonExistentId = '9999'

            // Act
            const user = await signUpSetup();
            const result = expectFailure(await getLocationById(user.userId, nonExistentId, {db: prisma}))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
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

            const user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma, photoInput: photoInput}));
            expect(createdLocation.id).toBeDefined()
            expect(createdLocation.id).not.toBeNull()

            // Act
            const result = await getLocationWithPhotos(user.userId, createdLocation.id, {db: prisma})

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

            const user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}));
            expect(createdLocation.id).toBeDefined()
            expect(createdLocation.id).not.toBeNull()

            // Act
            const result = await getLocationWithPhotos(user.userId, createdLocation.id, {db: prisma})

            // Assert
            expect(result).not.toBeNull()
            expect(result!.id).toBe(createdLocation.id)
            expect(result!.photos).toHaveLength(0)
        })
    })

    describe('updateLocation', () => {

        let locationId: string
        let user: any

        beforeEach(async() => {
            const locationInput = {
                name: 'Downtown Alley',
                address: '123 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, { db: prisma }));
            locationId = createdLocation.id;
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

            const user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}))

            // Act
            const updatedData = {
                name: 'Updated Alley',
                city: 'Ottawa'
            }
            const result = expectSuccess(await updateLocation(user.userId, createdLocation.id, updatedData, {db: prisma}))

            // Assert
            expect(result).not.toBeNull()
            expect(result.id).toBe(createdLocation.id)
            expect(result.name).toBe(updatedData.name)
            expect(result.city).toBe(updatedData.city)
            expect(result.address).toBe(locationInput.address) // unchanged
            expect(result.province).toBe(locationInput.province) // unchanged
            expect(result.postalCode).toBe(locationInput.postalCode) // unchanged
            expect(result.updatedAt.getTime()).toBeGreaterThan(createdLocation.updatedAt.getTime()) // updatedAt should be more recent than createdAt
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
            await expect(updateLocation(user.userId, locationId, locationInput, { db: prisma })).rejects.toThrow();
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

                const user = await signUpSetup();
                const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, { db: prisma }))

                // Act
                const updatedData = {
                    status: LocationStatus.ARCHIVED
                }
                const result = expectSuccess(await updateLocation(user.userId, createdLocation.id, updatedData, {db: prisma}))

                // Assert
                expect(result).not.toBeNull()
                expect(result.id).toBe(createdLocation.id)
                expect(result.status).toBe(LocationStatus.ARCHIVED)
        })
    })

    describe('deleteLocation', () => {
        it('should mark a location as deleted without actually removing it from the database', async () => {
            // Arrange
            const locationInput = buildLocationInput();

            // Act
            const user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}))
            await deleteLocationById(user.userId, createdLocation.id, {db: prisma})
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
            const locationInput = buildLocationInput();

            const user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}))

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
            const createdLocationWithPhotos = await getLocationWithPhotos(user.userId, createdLocation.id, {db: prisma})
            expect(createdLocationWithPhotos).not.toBeNull()
            expect(createdLocationWithPhotos!.photos).toHaveLength(numOfPhotos)


            // Act
            await deleteLocationById(user.userId, createdLocation.id, {db: prisma})
            const associatedPhotos = await prisma.photo.findMany({
                where: {locationId: createdLocation.id}
            })

            // Assert
            expect(associatedPhotos).toHaveLength(numOfPhotos);
        })

        it('should idempotently delete a location that is already marked as deleted', async () => {
            // Arrange
            const locationInput = buildLocationInput();
            const user = await signUpSetup();
            const createdLocation = expectSuccess(await createLocation(user.userId, locationInput, {db: prisma}))

            // Act - First deletion
            await deleteLocationById(user.userId, createdLocation.id, {db: prisma})
            const firstDeletion = await prisma.location.findFirst({
                where: {id: createdLocation.id}
            })

            expect(firstDeletion).not.toBeNull();
            expect(firstDeletion?.status).toBe('DELETED');
            expect(firstDeletion?.deletedAt).not.toBeNull();

            const now = new Date();
            expect(firstDeletion?.deletedAt?.getFullYear()).toBe(now.getFullYear());
            expect(firstDeletion?.deletedAt?.getMonth()).toBe(now.getMonth());
            expect(firstDeletion?.deletedAt?.getDate()).toBe(now.getDate());

            // Act - Second deletion (should be idempotent)
            await deleteLocationById(user.userId, createdLocation.id, {db: prisma})
            const secondDeletion = await prisma.location.findFirst({
                where: {id: createdLocation.id}
            })

            // Assert - Verify that the second deletion did not change the status or deletedAt timestamp
            expect(secondDeletion).not.toBeNull();
            expect(secondDeletion?.status).toBe('DELETED');
            expect(secondDeletion?.deletedAt).not.toBeNull();
            expect(secondDeletion?.deletedAt?.getFullYear()).toBe(now.getFullYear());
            expect(secondDeletion?.deletedAt?.getMonth()).toBe(now.getMonth());
            expect(secondDeletion?.deletedAt?.getDate()).toBe(now.getDate());
            expect(secondDeletion?.deletedAt?.getTime()).toBe(firstDeletion?.deletedAt?.getTime());
        })
    })

    describe('getLocations', () => {
        it('should get all locations not marked with the DELETED status', async () => {
            // Arrange
            // Prepare test data with a mix of ACTIVE and DELETED locations
            const activeLocationInput = buildLocationInput({
                name: 'Active Location',
                address: '123 Active St',
            });

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

            const user = await signUpSetup();
            await createLocation(user.userId, activeLocationInput, {db: prisma})
            await createLocation(user.userId, secondActiveLocationInput, {db: prisma})
            const deletedLocation = expectSuccess(await createLocation(user.userId, deletedLocationInput, {db: prisma}))

            await deleteLocationById(user.userId, deletedLocation.id, {db: prisma})

            // Act
            const results = await getLocations(user.userId, {db: prisma})

            // Assert
            expect(results).toHaveLength(2)
            const locationNames = results.map((loc: { name: any; }) => loc.name)
            expect(locationNames).toContain(activeLocationInput.name)
            expect(locationNames).toContain(secondActiveLocationInput.name)
            expect(locationNames).not.toContain(deletedLocation.name)
        })
    })
})