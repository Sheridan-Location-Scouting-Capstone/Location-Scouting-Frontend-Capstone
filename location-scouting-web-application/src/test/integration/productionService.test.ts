import {prisma} from '@/test/setup'
import {describe, expect, it, vi, beforeAll} from 'vitest'
import {createProject, getProjectById, getProjects} from "@/services/productionService";
import {Geocoder} from "@/schemas/geocoder";
import {signUpSetup} from "@/test/e2e/fixtures";
import {expectFailure, expectSuccess} from "@/test/helpers/result";
import {ErrorCode} from "@/schemas/result";

const mockLat = 43.6532
const mockLong = -79.3832
const mockGeocoder: Geocoder = async () => ({lat: mockLat, lng: mockLong})

describe('Production Service', () => {
    describe('createProject', () => {

        let user: any

        beforeAll(async () => {
            user = await signUpSetup();
        })

        it('should save a production with minimum required fields', async () => {
            // Arrange
            const productionInput = {
                name: 'Test Production',
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            }

            // Act
            const sut = expectSuccess(await createProject(user.userId, productionInput, {db: prisma}));

            // Assert
            expect(sut.name).toBe(productionInput.name)
            expect(sut.id).toBeDefined()
        })

        it('should fail to save a production with missing required fields', async () => {
            // Arrange
            const productionInput = {
                name: undefined as unknown as string,
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            }

            const result = expectFailure(await createProject(user.userId, productionInput, {db: prisma}))

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
        })

        it(' should geocode the the studio address on creation', async () => {
            // Arrange
            const productionInput = {
                name: 'Test Production',
                address: '456 Film St',
                city: 'Trenton',
                province: 'ON',
                postalCode: 'L6H 0Y1',
                country: 'Canada'
            }

            // Act
            const result = expectSuccess(await createProject(user.userId, productionInput, {db: prisma, geocoder: mockGeocoder}))


            // Assert - refetch because the pattern is fire and forget
            await vi.waitFor(async () => {
                const savedProject = expectSuccess(await getProjectById(user.userId, result.id, {db: prisma}))
                expect(savedProject!.latitude).not.toBeNull()
                expect(savedProject!.longitude).not.toBeNull()
                expect(savedProject!.latitude).toBe(mockLat)
                expect(savedProject!.longitude).toBe(mockLong)
            })
        })
    })

    describe('Get Productions', () => {
        let user: any

        beforeAll(async () => {
            user = await signUpSetup();
        })

        it('should retrieve a list of productions', async () => {
            // Arrange - Create a production to ensure there is at least one
            const productionInput = {
                name: 'Another Test Production',
                address: '789 Movie Ave',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 2B2',
                country: 'Canada'
            }
            await createProject(user.userId, productionInput, {db: prisma})

            // Act
            const productions = await getProjects(user.userId, {db: prisma})

            // Assert
            if (productions.success) {
                expect(productions.data).toBeInstanceOf(Array)
                expect(productions.data.length).toBeGreaterThan(0)
                const found = productions.data.find(p => p.name === productionInput.name)
                expect(found).toBeDefined()
                if (found) {
                    expect(found.address).toBe(productionInput.address)
                    expect(found.city).toBe(productionInput.city)
                }
            }
        })
    })

    describe('Get Production By ID', () => {
        let user: any

        beforeAll(async () => {
            user = await signUpSetup();
        })

        it(' should retrieve a production by its ID', async () => {
            // Arrange
            const productionInput = {
                name: 'Another Test Production',
                address: '789 Movie Ave',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 2B2',
                country: 'Canada'
            }

            const createdProjectResult = expectSuccess(await createProject(user.userId, productionInput, { db: prisma }))


            // Act
            expect(createdProjectResult.id).toBeDefined()
            expect(createdProjectResult.id).not.toBeNull()
            const result = expectSuccess(await getProjectById(user.userId, createdProjectResult.id, { db: prisma }))


            // Assert
            expect(result.id).toEqual(createdProjectResult.id)
            expect(result.name).toEqual(productionInput.name)
            expect(result.address).toEqual(productionInput.address)
            expect(result.city).toEqual(productionInput.city)
            expect(result.province).toEqual(productionInput.province)
            expect(result.postalCode).toEqual(productionInput.postalCode)
            expect(result.country).toEqual(productionInput.country)
        })

        it(' should fail to find a production by its ID when it does not exist', async () => {
            // Arrange
            const nonExistentID = "kdhngowie90238hfglskjd90ThisShouldNotExist";

            // Act
            const result = expectFailure(await getProjectById(user.userId, nonExistentID, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })
})