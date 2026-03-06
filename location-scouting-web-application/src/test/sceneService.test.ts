import {prisma} from '@/test/setup'
import {describe, expect, it, test, vi} from 'vitest'
import {IntExt} from "@prisma/client";
import {createScene, getScenesForProject} from "@/app/services/sceneService";
import {createProject} from "@/app/services/productionService";


describe('Scene Service', () => {
    describe('createScene', () => {
        it('should create a scene with valid input', async () => {
            // Arrange
            // First create a project to associate the scene with
            const project = await prisma.project.create({
                  data: {
                      name: 'Test Project',
                      address: '456 Film St',
                      city: 'Vancouver',
                      province: 'BC',
                      postalCode: 'V5K 0A1',
                      country: 'Canada'
                  }
            })

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

            // Act
            const createdScene = await createScene(sceneInput, { db: prisma })

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

        it('should get all scenes associated with a project', async () => {
            // Arrange
            // First create a project to associate the scene with
            const project = await prisma.project.create({
                data: {
                    name: 'Test Project',
                    address: '456 Film St',
                    city: 'Vancouver',
                    province: 'BC',
                    postalCode: 'V5K 0A1',
                    country: 'Canada'
                }
            })

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


            await createScene(sceneInput, { db: prisma })
            await createScene(additionalSceneInput, { db: prisma })

            // Act
            const result = await getScenesForProject(project.id, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data).not.toBeNull()
                expect(result.data).toHaveLength(2)
                const sceneNumbers = result.data.map(s => s.sceneNumber)
                expect(sceneNumbers).toContain(sceneInput.sceneNumber)
                expect(sceneNumbers).toContain(additionalSceneInput.sceneNumber)
            }
        })
    })
})