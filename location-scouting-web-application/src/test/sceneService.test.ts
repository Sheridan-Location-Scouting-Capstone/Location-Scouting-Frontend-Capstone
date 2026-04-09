import {prisma} from '@/test/setup'
import {beforeEach, describe, expect, it, test, vi} from 'vitest'
// @ts-ignore
import {IntExt} from "@prisma/client";
import {createScene, deleteScene, getSceneById, getScenesForProject} from "@/app/services/sceneService";
import {createProject} from "@/app/services/productionService";
import {KeywordGenerator} from "@/app/services/keywordGenerator";
import {createLocation} from "@/app/services/locationService";
import {Geocoder} from "@/app/schemas/geocoder";
import {createCandidate, getCandidateById, getCandidatesForScene} from "@/app/services/candidateService";


const dummyKeyWordGen: KeywordGenerator = async() => ({ success: true, data: ['generated', 'keywords']})
const failingGenerator: KeywordGenerator = async() => ({ success: false, error: "Error Failed" })

describe('Scene Service', () => {

    let projectId: string

    const mockGeocoder: Geocoder = async () => ({lat: 43.6532, lng: -79.3832})

    beforeEach(async () => {
        const project = await createProject({
            name: 'Test Project',
            address: '456 Film St',
            city: 'Vancouver',
            province: 'BC',
            postalCode: 'V5K 0A1',
            country: 'Canada'
        }, { db: prisma })

        expect(project.success).toBe(true)
        if (!project.success) return
        projectId = project.data!.id
    })

    describe('createScene', () => {
        it('should create a scene with valid input', async () => {
            // Arrange
            // First create a project to associate the scene with
            const project = await createProject({
                      name: 'Test Project',
                      address: '456 Film St',
                      city: 'Vancouver',
                      province: 'BC',
                      postalCode: 'V5K 0A1',
                      country: 'Canada'
            }, { db: prisma })

            // Verify project was created successfully before continuing
            expect(project.success).toBe(true)

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
                projectId: project.data!.id
            }


            // Act
            const createdScene = await createScene(sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen })

            // Assert
            expect(createdScene.success).toBe(true)
            if(createdScene.success) {
                expect(createdScene.data).not.toBeNull()
                expect(createdScene.data.sceneNumber).toBe(sceneInput.sceneNumber)
                expect(createdScene.data.intExt).toBe(sceneInput.intExt)
                expect(createdScene.data.sceneLocation).toBe(sceneInput.sceneLocation)
                expect(createdScene.data.sceneTimeOfDay).toBe(sceneInput.sceneTimeOfDay)
                expect(createdScene.data.scriptSection).toBe(sceneInput.scriptSection)
                expect(createdScene.data.projectId).toBe(sceneInput.projectId)
            }
        })

        it('should identify location characteristics from the script section', async () => {
            // Arrange
            // First create a project to associate the scene with
            const project = await createProject({
                    name: 'Test Project',
                    address: '456 Film St',
                    city: 'Vancouver',
                    province: 'BC',
                    postalCode: 'V5K 0A1',
                    country: 'Canada'
            }, { db: prisma })

            // Verify project creation was successful
            expect(project.success).toBe(true)
            if (!project.success) {
                throw new Error('Failed to create project for test setup')
            }
            console.log("created project for scene test:", project.data)

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
                projectId: project.data!.id
            }


            // Test double for keyword generation
            const fakeKeywordGenerator: KeywordGenerator = async() => ({ success: true, data: ['house', 'backyard'] })

            // Act
            const createdScene = await createScene(sceneInput, { db: prisma, keywordGenerator: fakeKeywordGenerator })

            // Assert
            expect(createdScene.success).toBe(true)
            if(createdScene.success) {
                expect(createdScene.data).not.toBeNull()
                expect(createdScene.data.keywords).toBeDefined()
                expect(createdScene.data.keywords).to.contain('backyard')
                expect(createdScene.data.keywords).to.contain('house')
            }
        })

        it('INTEGRATION: should identify location characteristics from the script section', async () => {
            // Arrange
            const project = await createProject({
                name: 'Test Project',
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            }, { db: prisma })
            expect(project.success).toBe(true);
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
                projectId: project.data!.id
            }

            // Act
            const createdScene = await createScene(sceneInput, { db: prisma })

            // Assert
            expect(createdScene.success).toBe(true)
            if(createdScene.success) {
                expect(createdScene.data).not.toBeNull()
                expect(createdScene.data.keywords).toBeDefined()
                console.log(createdScene.data.keywords)
            }
        }, 10000)
    })

    describe('getScenesForProject', () => {
        it('should get all scenes associated with a project', async () => {
            // Arrange
            // First create a project to associate the scene with
            const project = await createProject({
                name: 'Test Project',
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            }, { db: prisma })

            // Verify project was created successfully before continuing
            expect(project.success).toBe(true)

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
                projectId: project.data!.id
            }

            const additionalSceneInput = {
                sceneNumber: 3,
                intExt: IntExt.INT,
                sceneLocation: 'CURTIS HOME - LIVING AREA',
                sceneTimeOfDay: 'Night',
                scriptSection: ' SOUND of music playing.\n' +
                    '\n' +
                    '     ELWOOD\'s POV from where he\'s sitting on his   mother\'s lap, is\n' +
                    '     concentrated on a drop of condensation on a   can of beer on\n' +
                    '     the table before him. Lights reflect on and   off the aluminum.\n' +
                    '     A party is winding down. Cigarette butts in   the ashtray.\n' +
                    '\n' +
                    '     His mother EVELYN (late 20s, slim, tired eyes) and his father\n' +
                    '     PERCY (30s, fit and restless) play gin rummy with friends. A\n' +
                    '     couple in the background is swaying in a boozy slow dance.\n' +
                    '\n' +
                    '     The dew drop begins to slide down the side of the beer can.\n' +
                    '\n' +
                    '     Percy throws a discarded card face down.',
                projectId: project.data!.id
            }


            await createScene(sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen })
            await createScene(additionalSceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen })

            // Act
            const result = await getScenesForProject(project.data!.id, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data).not.toBeNull()
                expect(result.data).toHaveLength(2)
                const sceneNumbers = result.data.map((s: { sceneNumber: any; }) => s.sceneNumber)
                expect(sceneNumbers).toContain(sceneInput.sceneNumber)
                expect(sceneNumbers).toContain(additionalSceneInput.sceneNumber)
            }
        })
    })

    describe('Delete Scene', () => {

        let sceneId : string
        let locationId : string
        let candidateId: string

        beforeEach( async () => {
            // Arrange - create a scene
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
                projectId: projectId
            }

            const sceneCreationResult = await createScene(sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen })
            expect(sceneCreationResult.success).toBe(true)
            if(!sceneCreationResult.success) return

            sceneId = sceneCreationResult.data!.id

            // Arrange a location
            const locationInput = {
                name: 'CN Tower',
                address: '290 Bremner Blvd',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 3L9'
            }

            const locationCreationResult = await createLocation(locationInput, { db: prisma, geocoder: mockGeocoder })
            expect(locationCreationResult).toBeDefined()
            locationId = locationCreationResult.id

            // Arrange a candidate
            const candidateInput = {
                locationId: locationCreationResult.id,
                sceneId: sceneId,
                selected: false
            }

            const candidateCreationResult = await createCandidate(candidateInput, { db: prisma })
            expect(candidateCreationResult.success).toBe(true)
            if(!candidateCreationResult.success) return

            candidateId = candidateCreationResult.data!.id

            // This fixture allows to test that when you delete a scene, the candidate is deleted, but the location is unaffected
        })

        it(' a scene should no longer exist after deleting it ', async () => {
            // Act
            const result = await deleteScene(sceneId, { db: prisma })

            // Assert
            console.log('Deleting Scene')
            expect(result.success).toBe(true)

            // Assert again to verify scene no longer exists
            const findSceneResult = await getSceneById( sceneId, { db: prisma })
            expect(findSceneResult.success).toBe(false)
        })

        it(' should delete associated candidate(s)', async () => {
            // Arrange
            const deleteResult = await deleteScene(sceneId, { db: prisma })
            expect(deleteResult.success).toBe(true)
            if(!deleteResult.success) return

            // Act
            const findCandidateResult = await getCandidateById(candidateId, { db: prisma })

            // Assert
            expect(findCandidateResult.success).toBe(false)
        })
    })
})