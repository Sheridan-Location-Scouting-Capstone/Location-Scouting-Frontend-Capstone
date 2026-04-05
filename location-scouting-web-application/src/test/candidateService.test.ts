import {beforeEach, expect, describe, it, test} from "vitest";
import {createLocation} from "@/app/services/locationService";
import { prisma } from '@/test/setup'
import {createProject} from "@/app/services/productionService";
import {IntExt} from "@prisma/client";
import {KeywordGenerator} from "@/app/services/keywordGenerator";
import {createScene} from "@/app/services/sceneService";
import {createCandidate, getCandidatesForScene} from "@/app/services/candidateService";
import {addPhotosToLocation} from "@/app/services/locationPhotoService";
import {Geocoder} from "@/app/schemas/geocoder";

const dummyKeyWordGen: KeywordGenerator = async() => ({ success: true, data: ['house', 'generated', 'gothic'] })

describe('Candidate Services', () => {
    let locationId: string
    let projectId: string
    let sceneId: string

    const mockGeocoder: Geocoder = async () => ({ lat: 43.6532, lng: -79.3832 })


    beforeEach(async() => {
        // Location Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1'
        }

        const locationResult = await createLocation(locationInput, { db: prisma, geocoder: mockGeocoder })

        expect(locationResult.id).toBeDefined()
        expect(locationResult.id).not.toBeNull()
        locationId = locationResult.id

        // Project Arrange
        const productionInput = {
            name: 'Another Test Production',
            address: '789 Movie Ave',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 2B2',
            country: 'Canada'
        }
        const projectResult = await createProject(productionInput, {db: prisma})

        expect(projectResult.success).toBe(true)
        if(projectResult.success) {
            projectId = projectResult.data.id
        }

        // Scene Arrange
        const sceneInput = {
            sceneNumber: 2,
            intExt: IntExt.EXT,
            sceneLocation: 'CURTIS HOME - YARD - FRENCHTOWN FL',
            sceneTimeOfDay: 'Day',
            scriptSection: ' ELWOOD (6-8ish) POV of the midday sky where the moon is\n' +
                '     visible against its blue hue. The underside of a lemon tree\n' +
                '     with lemons is also in view.\n' +
                '\n' +
                '                         EVELYN (O.S.)\n' +
                '                   (calling out)\n' +
                '               Elwood? Elwood! (louder) El!\n' +
                '\n' +
                '     He tilts his head toward the house, his arm outstretched in\n' +
                '     the same direction in the unruly tropical backyard of the\n' +
                '     family house.\n' +
                '\n' +
                '                         HATTIE (O.S.)\n' +
                '               He\'s out back, looking like he fell\n' +
                '               out.\n',
            projectId: projectResult.data.id
        }

        const sceneResult = await createScene(sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen})
        expect(sceneResult.success).toBe(true)
        expect(sceneResult.data.id).not.toBeNull()
        expect(sceneResult.data.projectId).toBe(projectId)
        if(sceneResult.success) {
            sceneId = sceneResult.data.id
        }
    })

    describe('Create Candidate', () => {
        it(' should save a candidate with minimum required fields and return it with an id', async() => {
            // Arrange
            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId
            }

            // Act
            const result = await createCandidate(candidateInput, {db: prisma})

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data.id).toBeDefined()
                expect(result.data.id).not.toBeNull()
                expect(result.data.sceneId).toBe(sceneId)
                expect(result.data.locationId).toBe(locationId)
                expect(result.data.selected).toBe(false)
            }
        })

        it(' should associate selected photos with the candidate', async () => {
            // Arrange - add photos to the test data location
            const photoInput = [{
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test.jpg',
                    mimeType: 'image/jpeg'
                },
                {
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test2.jpg',
                    mimeType: 'image/jpeg'
                }]

            const photoResult = await addPhotosToLocation(locationId, photoInput, { db: prisma })
            expect(photoResult.success).toBe(true)
            let photoIds: string[] = []
            if(photoResult.success) {
                photoIds = photoResult.data.map(p => p.id)
            }


            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId,
                photos: photoIds
            }

            // Act
            const result = await createCandidate(candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                const candidatePhotos = await prisma.candidatePhoto.findMany({
                    where : { candidateId: result.data.id }
                })
                expect(candidatePhotos).toBeDefined()
                expect(candidatePhotos).toHaveLength(2)
            }
        })

        test.each([
            { selected: true },
            { selected: false },
            { selected: undefined }
        ])('should save a candidate with selected=$selected', async({selected}) => {
            // Arrange
            const candidateInput = {
                sceneId,
                locationId,
                ... (selected !== undefined && { selected })
            }

            // Act
            const result = await createCandidate(candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success){
                expect(result.data.id).toBeDefined()
                expect(result.data.id).not.toBeNull()
                expect(result.data.sceneId).toBe(sceneId)
                expect(result.data.locationId).toBe(locationId)
                expect(result.data.selected).toBe(selected ?? false)
            }
        })

        it.each([
            {
                sceneId: "doesntexist",
                locationId: undefined
            },
            {
                sceneId: undefined,
                locationId: "doesntexist"
            }
        ])(' should fail to save if either the location or scene do not exist', async(input) => {
            // Arrange
            const candidateInput = {
                sceneId: input.sceneId ?? sceneId,
                locationId: input.locationId ?? locationId
            }

            // Act
            const result = await createCandidate( candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(false)
        })

        it(' should reject a candidate that already has a location associated with a scene', async() => {
            // Arrange
            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId
            }

            const setupResult = await createCandidate(candidateInput, { db: prisma })
            expect(setupResult.success).toBe(true)

            // Act
            const result = await createCandidate(candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(false)
        })
    })

    describe('Get all candidates by Scene', () => {

        let candidateIds: string[]


        beforeEach( async() => {
            // Arrange first candidate
            const firstCandidateInput = {
                sceneId: sceneId,
                locationId: locationId
            }


            // Arrange second location. This separates out the candidate set across multiple locations
            const secondLocationInput = {
                name: 'Downtown Alley',
                address: '124 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            // Act & Assert - create second location
            const secondLocationInputResult = await createLocation(secondLocationInput, { db: prisma, geocoder: mockGeocoder })
            expect(secondLocationInputResult).toBeDefined()
            expect(secondLocationInputResult.id).not.toBeNull()
            const secondLocationId: string = secondLocationInputResult.id


            // Arrange - second candidate
            const secondCandidateInput = {
                sceneId: sceneId,
                locationId: secondLocationId
            }

            // Act - create first and second candidates
            const firstCandidateResult = await createCandidate(firstCandidateInput, { db: prisma })
            const secondCandidateResult = await createCandidate(secondCandidateInput, { db: prisma })

            expect(firstCandidateResult.success).toBe(true)
            expect(secondCandidateResult.success).toBe(true)


            // Assert both candidates were created & assign ids to accessible values in tests
            let firstCandidateId : string
            let secondCandidateId : string

            if(firstCandidateResult.success) {
                expect(firstCandidateResult.data).toBeDefined()
                expect(firstCandidateResult.data.id).not.toBeNull()
                firstCandidateId = firstCandidateResult.data.id
            }

            if(secondCandidateResult.success) {
                expect(secondCandidateResult.data).toBeDefined()
                expect(secondCandidateResult.data.id).not.toBeNull()
                secondCandidateId = secondCandidateResult.data.id
            }

            candidateIds = [firstCandidateId!, secondCandidateId!]
        })


        it(' should get all candidates by scene id', async () => {
            // Arrange & Act
            const result = await getCandidatesForScene(sceneId, { db: prisma })

            // Assert
            expect(result).toBeDefined()
            expect(result.success).toBe(true)
            if(result.success){
                expect(result.data).toHaveLength(candidateIds.length)
                const resultIds: string[] = result.data.map(c => c.id)
                expect(resultIds).toEqual(expect.arrayContaining(candidateIds))
            }
        })

        it('')
    })

    describe('Delete Candidate', () => {

    })

    describe('Change Candidate Status', () => {

    })
})