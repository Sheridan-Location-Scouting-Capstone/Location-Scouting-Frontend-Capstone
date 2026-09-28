import {prisma} from '@/test/setup'
import {describe, expect, it, vi, beforeEach} from 'vitest'
import {
    createProject,
    getLocationsByProject,
    getProjectById,
    getProjects,
    updateProject
} from "@/services/productionService";
import {Geocoder} from "@/schemas/geocoder";
import {setupUserWithLocations, signUpSetup} from "@/test/e2e/fixtures";
import {expectFailure, expectSuccess} from "@/test/helpers/result";
import {ErrorCode} from "@/schemas/result";
import {createScene} from "@/services/sceneService";
import {createCandidate} from "@/services/candidateService";
import {KeywordGenerator} from "@/services/keywordGenerator";
import {buildProjectInput, buildSceneInput} from "@/test/helpers/builders";

const dummyKeyWordGen: KeywordGenerator = async () => ({ success: true, data: ['generated'] })

const mockLat = 43.6532
const mockLong = -79.3832
const mockGeocoder: Geocoder = async () => ({lat: mockLat, lng: mockLong})

describe('Production Service', () => {
    describe('createProject', () => {

        let user: any

        beforeEach(async () => {
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

        beforeEach(async () => {
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
            const productions = expectSuccess(await getProjects(user.userId, {db: prisma}))

            // Assert
            expect(productions).toBeInstanceOf(Array)
            expect(productions.length).toBeGreaterThan(0)
            const found = productions.find(p => p.name === productionInput.name)
            expect(found).toBeDefined()
            if (found) {
                expect(found.address).toBe(productionInput.address)
                expect(found.city).toBe(productionInput.city)
            }
        })
    })

    describe('Get Production By ID', () => {
        let user: any

        beforeEach(async () => {
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

    describe('getLocationsByProject', () => {
        it('should return the distinct candidate locations across a project\'s scenes', async () => {
            // Arrange - one location used as a candidate on two scenes
            const owner = await setupUserWithLocations(1)
            const ownerId = owner.user.userId
            const locationId = owner.locations[0].id
            const project = expectSuccess(await createProject(ownerId, buildProjectInput(), { db: prisma, geocoder: mockGeocoder }))
            for (const sceneNumber of [1, 2]) {
                const scene = expectSuccess(await createScene(ownerId, buildSceneInput(project.id, { sceneNumber }), { db: prisma, keywordGenerator: dummyKeyWordGen }))
                expectSuccess(await createCandidate(ownerId, { sceneId: scene.id, locationId }, { db: prisma }))
            }

            // Act
            const result = await getLocationsByProject(ownerId, { projectId: project.id }, { db: prisma })

            // Assert
            expect(result.data).toHaveLength(1)
            expect(result.data[0].locationId).toBe(locationId)
        })
    })

    describe('User isolation', () => {
        let ownerId: string
        let intruderId: string
        let projectId: string

        beforeEach(async () => {
            // Arrange - owner has a project with a scene and a candidate location; intruder is a separate user
            const owner = await setupUserWithLocations(1)
            ownerId = owner.user.userId
            intruderId = (await signUpSetup()).userId

            projectId = expectSuccess(await createProject(ownerId, buildProjectInput(), { db: prisma, geocoder: mockGeocoder })).id
            const scene = expectSuccess(await createScene(ownerId, buildSceneInput(projectId), { db: prisma, keywordGenerator: dummyKeyWordGen }))
            expectSuccess(await createCandidate(ownerId, { sceneId: scene.id, locationId: owner.locations[0].id }, { db: prisma }))
        })

        it('should not list another user\'s productions', async () => {
            // Act
            const result = expectSuccess(await getProjects(intruderId, { db: prisma }))

            // Assert
            expect(result).toHaveLength(0)
        })

        it('should only list the user\'s own productions when both users have productions', async () => {
            // Arrange
            const intruderProject = expectSuccess(await createProject(intruderId, buildProjectInput({ name: 'Intruder Production' }), { db: prisma, geocoder: mockGeocoder }))

            // Act
            const ownerProjects = expectSuccess(await getProjects(ownerId, { db: prisma }))
            const intruderProjects = expectSuccess(await getProjects(intruderId, { db: prisma }))

            // Assert
            expect(ownerProjects.map(p => p.id)).toEqual([projectId])
            expect(intruderProjects.map(p => p.id)).toEqual([intruderProject.id])
        })

        it('should not return another user\'s production by id', async () => {
            // Act
            const result = expectFailure(await getProjectById(intruderId, projectId, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })

        it('should not allow a user to update another user\'s production', async () => {
            // Act
            const result = expectFailure(await updateProject(intruderId, projectId, { name: 'Hijacked' }, { db: prisma, geocoder: mockGeocoder }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const project = expectSuccess(await getProjectById(ownerId, projectId, { db: prisma }))
            expect(project.name).not.toBe('Hijacked')
        })

        it('should not return candidate locations for another user\'s production', async () => {
            // Act
            const result = await getLocationsByProject(intruderId, { projectId }, { db: prisma })

            // Assert
            expect(result.data).toHaveLength(0)
        })
    })
})