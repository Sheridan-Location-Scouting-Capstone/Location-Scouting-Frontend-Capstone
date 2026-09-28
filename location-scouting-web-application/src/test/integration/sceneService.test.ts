import {prisma} from '@/test/setup'
import {beforeEach, describe, expect, it, test, vi} from 'vitest'
// @ts-ignore
import {IntExt} from "@prisma/client";
import {createScene, deleteScene, getSceneById, getScenesForProject, updateScene} from "@/services/sceneService";
import {buildProjectInput, buildSceneInput} from "@/test/helpers/builders";
import {createProject} from "@/services/productionService";
import {KeywordGenerator} from "@/services/keywordGenerator";
import {createLocation} from "@/services/locationService";
import {Geocoder} from "@/schemas/geocoder";
import {createCandidate, getCandidateById} from "@/services/candidateService";
import {signUpSetup} from "@/test/e2e/fixtures";
import {expectFailure, expectSuccess} from "@/test/helpers/result";
import {ErrorCode} from "@/schemas/result";


const dummyKeyWordGen: KeywordGenerator = async() => ({ success: true, data: ['generated', 'keywords']})
const failingGenerator: KeywordGenerator = async() => ({ success: false, error: "Error Failed" })

describe('Scene Service', () => {

    let projectId: string
    let userId: string

    const mockGeocoder: Geocoder = async () => ({lat: 43.6532, lng: -79.3832})

    beforeEach(async () => {
        const user = await signUpSetup();
        userId = user.userId;
        const project = expectSuccess(await createProject(
            userId,
            {
                name: 'Test Project',
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            },
            { db: prisma }))
        projectId = project.id
    })

    describe('createScene', () => {
        it('should create a scene with valid input', async () => {
            // Arrange
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


            // Act
            const createdScene = await createScene(userId, sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen })

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


            // Test double for keyword generation
            const fakeKeywordGenerator: KeywordGenerator = async() => ({ success: true, data: ['house', 'backyard'] })

            // Act
            const createdScene = expectSuccess(await createScene(userId, sceneInput, { db: prisma, keywordGenerator: fakeKeywordGenerator }))
            expect(createdScene).not.toBeNull()
            expect(createdScene.keywords).toBeDefined()
            expect(createdScene.id).not.toBeNull()
            expect(createdScene.id).toBeDefined()


            // Assert
            await vi.waitFor(async () => {
                const savedScene = expectSuccess(await getSceneById(userId, createdScene.id, { db: prisma }))
                expect(savedScene.keywords).to.contain('backyard')
                expect(savedScene.keywords).to.contain('house')
            })
        })

        it('INTEGRATION: should identify location characteristics from the script section', async () => {
            // Arrange
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

            // Act
            const createdScene = expectSuccess(await createScene(userId, sceneInput, { db: prisma }))

            // Assert
            expect(createdScene).not.toBeNull()
            expect(createdScene.keywords).toBeDefined()
            expect(createdScene.keywords).to.contain('backyard')
            expect(createdScene.keywords).to.contain('house')

        }, 10000)
    })

    describe('getScenesForProject', () => {
        it('should get all scenes associated with a project', async () => {
            // Arrange
            // First create a project to associate the scene with
            const project = expectSuccess(await createProject(userId, {
                name: 'Test Project',
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            }, { db: prisma }))

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
                projectId: project.id
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
                projectId: project.id
            }


            await createScene(userId, sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen })
            await createScene(userId, additionalSceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen })

            // Act
            const result = expectSuccess(await getScenesForProject(userId, project.id, { db: prisma }))

            // Assert
            expect(result).not.toBeNull()
            expect(result).toHaveLength(2)
            const sceneNumbers = result.map((s: { sceneNumber: any; }) => s.sceneNumber)
            expect(sceneNumbers).toContain(sceneInput.sceneNumber)
            expect(sceneNumbers).toContain(additionalSceneInput.sceneNumber)
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

            const sceneCreationResult = expectSuccess(await createScene(userId, sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen }))

            sceneId = sceneCreationResult.id

            // Arrange a location
            const locationInput = {
                name: 'CN Tower',
                address: '290 Bremner Blvd',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 3L9'
            }

            const locationCreationResult = expectSuccess(await createLocation(userId, locationInput, { db: prisma, geocoder: mockGeocoder }))
            locationId = locationCreationResult.id

            // Arrange a candidate
            const candidateInput = {
                locationId: locationCreationResult.id,
                sceneId: sceneId,
                selected: false
            }

            const candidateCreationResult = expectSuccess(await createCandidate(userId, candidateInput, { db: prisma }))

            candidateId = candidateCreationResult.id

            // This fixture allows to test that when you delete a scene, the candidate is deleted, but the location is unaffected
        })

        it(' a scene should no longer exist after deleting it ', async () => {
            // Act
            expectSuccess(await deleteScene(userId, sceneId, { db: prisma }))

            // Assert
            const findSceneResult = expectFailure(await getSceneById(userId, sceneId, { db: prisma }))
            expect(findSceneResult.code).toBe(ErrorCode.NOT_FOUND)
        })

        it(' should delete associated candidate(s)', async () => {
            // Arrange
            expectSuccess(await deleteScene(userId, sceneId, { db: prisma }))

            // Act
            const findCandidateResult = expectFailure(await getCandidateById(userId, candidateId, { db: prisma }))

            // Assert
            expect(findCandidateResult.code).toBe(ErrorCode.NOT_FOUND)
        })
    })

    describe('User isolation', () => {
        let intruderId: string
        let sceneId: string

        beforeEach(async () => {
            // Arrange - owner has a scene in their project (outer beforeEach); intruder is a separate user
            intruderId = (await signUpSetup()).userId
            sceneId = expectSuccess(await createScene(userId, buildSceneInput(projectId), {
                db: prisma,
                keywordGenerator: dummyKeyWordGen
            })).id
        })

        it('should not allow a user to create a scene in another user\'s project', async () => {
            // Act
            const result = expectFailure(await createScene(intruderId, buildSceneInput(projectId, { sceneNumber: 99 }), {
                db: prisma,
                keywordGenerator: dummyKeyWordGen
            }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const scenes = await prisma.scene.findMany({ where: { projectId } })
            expect(scenes.map(s => s.id)).toEqual([sceneId])
        })

        it('should not return another user\'s scene by id', async () => {
            // Act
            const result = expectFailure(await getSceneById(intruderId, sceneId, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })

        it('should not list scenes for another user\'s project', async () => {
            // Act
            const result = expectSuccess(await getScenesForProject(intruderId, projectId, { db: prisma }))

            // Assert
            expect(result).toHaveLength(0)
        })

        it('should not allow a user to update another user\'s scene', async () => {
            // Act
            const result = expectFailure(await updateScene(intruderId, sceneId, { sceneLocation: 'HIJACKED' }, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const scene = expectSuccess(await getSceneById(userId, sceneId, { db: prisma }))
            expect(scene.sceneLocation).not.toBe('HIJACKED')
        })

        it('should not allow a user to move their scene into another user\'s project', async () => {
            // Arrange - intruder owns a project and scene of their own
            const intruderProject = expectSuccess(await createProject(intruderId, buildProjectInput(), { db: prisma }))
            const intruderScene = expectSuccess(await createScene(intruderId, buildSceneInput(intruderProject.id), {
                db: prisma,
                keywordGenerator: dummyKeyWordGen
            }))

            // Act - intruder tries to re-parent their scene under the owner's project
            const result = expectFailure(await updateScene(intruderId, intruderScene.id, { projectId }, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const scenes = expectSuccess(await getScenesForProject(userId, projectId, { db: prisma }))
            expect(scenes.map(s => s.id)).toEqual([sceneId])
        })

        it('should not allow a user to delete another user\'s scene', async () => {
            // Act
            const result = expectFailure(await deleteScene(intruderId, sceneId, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expectSuccess(await getSceneById(userId, sceneId, { db: prisma }))
        })
    })

    describe('Update Scene', () => {
        let sceneId: string

        beforeEach(async () => {
            sceneId = expectSuccess(await createScene(userId, buildSceneInput(projectId), { db: prisma, keywordGenerator: dummyKeyWordGen })).id
            await prisma.scene.update({ where: { id: sceneId }, data: { keywords: ['yard', 'lemon tree'] } })
        })

        it('should leave keywords untouched when a partial update omits them', async () => {
            // Act
            const result = expectSuccess(await updateScene(userId, sceneId, { sceneLocation: 'FRONT PORCH' }, { db: prisma }))

            // Assert
            expect(result.sceneLocation).toBe('FRONT PORCH')
            expect(result.keywords).toEqual(['yard', 'lemon tree'])
        })

        it('should return field errors when validation fails', async () => {
            // Act
            const result = expectFailure(await updateScene(userId, sceneId, { sceneLocation: '' }, { db: prisma }))

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            expect(result.fieldErrors?.sceneLocation).toBeDefined()
        })
    })

    describe('createScene validation', () => {
        it('should return a validation failure instead of throwing on invalid input', async () => {
            // Act
            const result = expectFailure(await createScene(userId, { ...buildSceneInput(projectId), sceneNumber: Number.NaN }, { db: prisma, keywordGenerator: dummyKeyWordGen }))

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            expect(result.fieldErrors?.sceneNumber).toBeDefined()
        })
    })
})