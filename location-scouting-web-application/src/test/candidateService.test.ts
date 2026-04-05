import {beforeEach, expect, describe, it, test} from "vitest";
import {createLocation} from "@/app/services/locationService";
import { prisma } from '@/test/setup'
import {createProject} from "@/app/services/productionService";
import {IntExt} from "@prisma/client";
import {KeywordGenerator} from "@/app/services/keywordGenerator";
import {createScene} from "@/app/services/sceneService";
import {createCandidate} from "@/app/services/candidateService";
import {addPhotosToLocation} from "@/app/services/locationPhotoService";

const dummyKeyWordGen: KeywordGenerator = async() => ({ success: true, data: ['house', 'generated', 'gothic'] })

describe('Candidate Services', () => {
    let locationId: string
    let projectId: string
    let sceneId: string

    beforeEach(async() => {
        // Location Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1'
        }

        const locationResult = await createLocation(locationInput, { db: prisma })

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
                locationId: locationId,
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



        })

        test.each([{}])(' should save a candidate with minimum required fields and %s', async function(description, input) {

        })
    })

    describe('Get all candidates by Scene', () => {
        it(' should get all candidates by scene id', async () => {

        })
    })

    describe('Delete Candidate', () => {

    })

    describe('Change Candidate Status', () => {

    })
})