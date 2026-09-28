import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/test/setup'
import { revalidatePath } from 'next/cache'
import * as productionActions from '@/actions/productionActions'
import {
    createProjectAction,
    createSceneAction,
    deleteSceneAction,
    getProject,
    getProjectsAction,
    getSceneAction,
    getScenesAction,
    updateProjectAction,
    updateSceneAction,
} from '@/actions/productionActions'
import { createProject } from '@/services/productionService'
import { createScene } from '@/services/sceneService'
import { signUpSetup } from '@/test/e2e/fixtures'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { buildProjectInput, buildSceneInput } from '@/test/helpers/builders'
import { actAs, actAsAnonymous, everyExportedAction, expectRedirect, formDataFrom } from '@/test/helpers/actions'
import { ErrorCode } from '@/schemas/result'
import { Geocoder } from '@/schemas/geocoder'
import { KeywordGenerator } from '@/services/keywordGenerator'

vi.mock('@/lib/auth-session', () => ({ requireUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw Object.assign(new Error('NEXT_REDIRECT'), { url }) }) }))

const mockGeocoder: Geocoder = async () => ({ lat: 43.6532, lng: -79.3832 })
const dummyKeyWordGen: KeywordGenerator = async () => ({ success: true, data: ['generated'] })

describe('Production Actions', () => {
    let ownerId: string
    let intruderId: string
    let projectId: string
    let sceneId: string

    beforeEach(async () => {
        vi.clearAllMocks()

        // Arrange - owner has a project with one scene; intruder is a separate user with nothing
        ownerId = (await signUpSetup()).userId
        intruderId = (await signUpSetup()).userId
        projectId = expectSuccess(await createProject(ownerId, buildProjectInput(), { db: prisma, geocoder: mockGeocoder })).id
        sceneId = expectSuccess(await createScene(ownerId, buildSceneInput(projectId), { db: prisma, keywordGenerator: dummyKeyWordGen })).id

        actAs(ownerId)
    })

    describe('authentication', () => {
        it.each(everyExportedAction(productionActions))('%s should require a signed-in user', async (_name, action) => {
            // Arrange
            actAsAnonymous()

            // Act & Assert
            await expect(action('any-id', new FormData())).rejects.toThrow('UNAUTHENTICATED')
            expect(revalidatePath).not.toHaveBeenCalled()
        })
    })

    describe('getProjectsAction', () => {
        it('should return only the signed-in user\'s projects', async () => {
            // Arrange
            await createProject(intruderId, buildProjectInput({ name: 'Intruder Production' }), { db: prisma, geocoder: mockGeocoder })

            // Act
            const projects = expectSuccess(await getProjectsAction())

            // Assert
            expect(projects.map(p => p.id)).toEqual([projectId])
        })
    })

    describe('getProject', () => {
        it('should return the signed-in user\'s project', async () => {
            // Act
            const project = expectSuccess(await getProject(projectId))

            // Assert
            expect(project.id).toBe(projectId)
        })

        it('should return NOT_FOUND for another user\'s project', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await getProject(projectId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })

    describe('createProjectAction', () => {
        it('should create the project for the signed-in user and redirect to it', async () => {
            // Arrange
            const formData = formDataFrom(buildProjectInput({ name: 'Brand New Production' }))

            // Act & Assert
            await expect(createProjectAction(formData)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' })

            const created = await prisma.project.findFirst({ where: { name: 'Brand New Production' } })
            expect(created).not.toBeNull()
            expect(created!.userId).toBe(ownerId)
            expect(revalidatePath).toHaveBeenCalledWith('/productions')
        })

        it('should return a validation failure without redirecting when the form is invalid', async () => {
            // Arrange
            const formData = formDataFrom({ address: '456 Film St' })

            // Act
            const result = expectFailure((await createProjectAction(formData))!)

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            expect(result.fieldErrors?.name).toBeDefined()
            expect(revalidatePath).not.toHaveBeenCalled()
        })
    })

    describe('updateProjectAction', () => {
        it('should update the signed-in user\'s project and redirect to it', async () => {
            // Arrange
            const formData = formDataFrom(buildProjectInput({ name: 'Renamed Production' }))

            // Act & Assert
            await expectRedirect(updateProjectAction(projectId, formData), `/productions/${projectId}`)
            const project = await prisma.project.findUnique({ where: { id: projectId } })
            expect(project!.name).toBe('Renamed Production')
        })

        it('should return a validation failure when a required field is cleared', async () => {
            // Arrange
            const formData = formDataFrom(buildProjectInput({ name: '' }))

            // Act
            const result = expectFailure((await updateProjectAction(projectId, formData))!)

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            expect(result.fieldErrors?.name).toBeDefined()
            const project = await prisma.project.findUnique({ where: { id: projectId } })
            expect(project!.name).toBe(buildProjectInput().name)
        })

        it('should not update another user\'s project', async () => {
            // Arrange
            actAs(intruderId)
            const formData = formDataFrom(buildProjectInput({ name: 'Hijacked' }))

            // Act
            const result = expectFailure((await updateProjectAction(projectId, formData))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(revalidatePath).not.toHaveBeenCalled()
            const project = await prisma.project.findUnique({ where: { id: projectId } })
            expect(project!.name).not.toBe('Hijacked')
        })
    })

    describe('getScenesAction', () => {
        it('should return the scenes for the signed-in user\'s project', async () => {
            // Act
            const scenes = expectSuccess(await getScenesAction(projectId))

            // Assert
            expect(scenes.map(s => s.id)).toEqual([sceneId])
        })

        it('should return no scenes for another user\'s project', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const scenes = expectSuccess(await getScenesAction(projectId))

            // Assert
            expect(scenes).toHaveLength(0)
        })
    })

    describe('getSceneAction', () => {
        it('should return the signed-in user\'s scene', async () => {
            // Act
            const scene = expectSuccess(await getSceneAction(sceneId))

            // Assert
            expect(scene.id).toBe(sceneId)
            expect(scene.projectId).toBe(projectId)
        })

        it('should return NOT_FOUND for another user\'s scene', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await getSceneAction(sceneId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })

    describe('createSceneAction', () => {
        const sceneForm = (targetProjectId: string) => formDataFrom({
            sceneNumber: 7,
            intExt: 'INT',
            sceneLocation: 'KITCHEN',
            sceneTimeOfDay: 'Night',
            scriptSection: 'A quiet kitchen at night.',
            projectId: targetProjectId,
        })

        it('should create a scene in the signed-in user\'s project and redirect to the project', async () => {
            // Act & Assert
            await expectRedirect(createSceneAction(sceneForm(projectId)), `/productions/${projectId}`)
            const scenes = await prisma.scene.findMany({ where: { projectId, sceneNumber: 7 } })
            expect(scenes).toHaveLength(1)
        })

        it('should return a validation failure without redirecting when the form is invalid', async () => {
            // Arrange - scene number left blank
            const formData = sceneForm(projectId)
            formData.set('sceneNumber', '')

            // Act
            const result = expectFailure((await createSceneAction(formData))!)

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            expect(result.fieldErrors?.sceneNumber).toBeDefined()
            expect(revalidatePath).not.toHaveBeenCalled()
        })

        it('should not create a scene in another user\'s project', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await createSceneAction(sceneForm(projectId)))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(revalidatePath).not.toHaveBeenCalled()
            const scenes = await prisma.scene.findMany({ where: { projectId, sceneNumber: 7 } })
            expect(scenes).toHaveLength(0)
        })
    })

    describe('updateSceneAction', () => {
        const updateForm = () => formDataFrom({
            sceneNumber: 1,
            intExt: 'EXT',
            sceneLocation: 'UPDATED YARD',
            sceneTimeOfDay: 'Dusk',
            scriptSection: 'The yard at dusk.',
            keywords: JSON.stringify(['yard']),
        })

        it('should update the signed-in user\'s scene and redirect to it', async () => {
            // Act & Assert
            await expectRedirect(updateSceneAction(sceneId, projectId, updateForm()), `/productions/${projectId}/scenes/${sceneId}`)
            const scene = await prisma.scene.findUnique({ where: { id: sceneId } })
            expect(scene!.sceneLocation).toBe('UPDATED YARD')
            expect(scene!.keywords).toEqual(['yard'])
        })

        it('should not update another user\'s scene', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await updateSceneAction(sceneId, projectId, updateForm()))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(revalidatePath).not.toHaveBeenCalled()
            const scene = await prisma.scene.findUnique({ where: { id: sceneId } })
            expect(scene!.sceneLocation).not.toBe('UPDATED YARD')
        })
    })

    describe('deleteSceneAction', () => {
        it('should delete the signed-in user\'s scene and redirect to the project', async () => {
            // Act & Assert
            await expectRedirect(deleteSceneAction(sceneId, projectId), `/productions/${projectId}`)
            expect(await prisma.scene.findUnique({ where: { id: sceneId } })).toBeNull()
        })

        it('should not delete another user\'s scene', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await deleteSceneAction(sceneId, projectId))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(revalidatePath).not.toHaveBeenCalled()
            expect(await prisma.scene.findUnique({ where: { id: sceneId } })).not.toBeNull()
        })
    })
})
