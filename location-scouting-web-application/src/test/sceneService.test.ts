import {prisma} from '@/test/setup'
import {describe, expect, it, test, vi} from 'vitest'
import {IntExt} from "@prisma/client";
import {createScene} from "@/app/services/sceneService";


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
    })
})