import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/test/setup'
import { revalidatePath } from 'next/cache'
import * as candidateActions from '@/actions/candidateActions'
import {
    addCandidateAction,
    getCandidateAction,
    getCandidatesAction,
    getRecommendationsAction,
    removeCandidateAction,
    scoreCandidatesAction,
    toggleCandidateSelectedAction,
} from '@/actions/candidateActions'
import { createProject } from '@/services/productionService'
import { createScene } from '@/services/sceneService'
import { createCandidate } from '@/services/candidateService'
import { setupUserWithLocations } from '@/test/e2e/fixtures'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { buildProjectInput, buildSceneInput } from '@/test/helpers/builders'
import { actAs, actAsAnonymous, everyExportedAction } from '@/test/helpers/actions'
import { ErrorCode } from '@/schemas/result'
import { Geocoder } from '@/schemas/geocoder'
import { KeywordGenerator } from '@/services/keywordGenerator'

vi.mock('@/lib/auth-session', () => ({ requireUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw Object.assign(new Error('NEXT_REDIRECT'), { url }) }) }))

const mockGeocoder: Geocoder = async () => ({ lat: 43.6532, lng: -79.3832 })
const dummyKeyWordGen: KeywordGenerator = async () => ({ success: true, data: ['generated'] })

describe('Candidate Actions', () => {
    let ownerId: string
    let intruderId: string
    let projectId: string
    let sceneId: string
    let candidateLocationId: string
    let spareLocationId: string
    let intruderLocationId: string
    let candidateId: string

    beforeEach(async () => {
        vi.clearAllMocks()

        // Arrange - owner has a project, a scene, and two locations (one already a candidate on the scene)
        const owner = await setupUserWithLocations(2)
        ownerId = owner.user.userId
        candidateLocationId = owner.locations[0].id
        spareLocationId = owner.locations[1].id
        projectId = expectSuccess(await createProject(ownerId, buildProjectInput(), { db: prisma, geocoder: mockGeocoder })).id
        sceneId = expectSuccess(await createScene(ownerId, buildSceneInput(projectId), { db: prisma, keywordGenerator: dummyKeyWordGen })).id
        candidateId = expectSuccess(await createCandidate(ownerId, { sceneId, locationId: candidateLocationId }, { db: prisma })).id

        // Arrange - intruder has a location of their own
        const intruder = await setupUserWithLocations(1)
        intruderId = intruder.user.userId
        intruderLocationId = intruder.locations[0].id

        actAs(ownerId)
    })

    describe('authentication', () => {
        it.each(everyExportedAction(candidateActions))('%s should require a signed-in user', async (_name, action) => {
            // Arrange
            actAsAnonymous()

            // Act & Assert
            await expect(action('any-id', 'any-id', 'any-id', [])).rejects.toThrow('UNAUTHENTICATED')
            expect(revalidatePath).not.toHaveBeenCalled()
        })
    })

    describe('getCandidatesAction', () => {
        it('should return the candidates on the signed-in user\'s scene', async () => {
            // Act
            const candidates = expectSuccess(await getCandidatesAction(sceneId))

            // Assert
            expect(candidates.map(c => c.id)).toEqual([candidateId])
        })

        it('should return no candidates for another user\'s scene', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const candidates = expectSuccess(await getCandidatesAction(sceneId))

            // Assert
            expect(candidates).toHaveLength(0)
        })
    })

    describe('getCandidateAction', () => {
        it('should return the signed-in user\'s candidate', async () => {
            // Act
            const candidate = expectSuccess(await getCandidateAction(candidateId))

            // Assert
            expect(candidate.id).toBe(candidateId)
            expect(candidate.sceneId).toBe(sceneId)
        })

        it('should return NOT_FOUND for another user\'s candidate', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await getCandidateAction(candidateId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })

    describe('scoreCandidatesAction', () => {
        it('should return a plain object of scores keyed by candidate id', async () => {
            // Act
            const scores = expectSuccess(await scoreCandidatesAction(sceneId))

            // Assert
            expect(scores).not.toBeInstanceOf(Map)
            expect(Object.keys(scores)).toEqual([candidateId])
            expect(typeof scores[candidateId]).toBe('number')
        })

        it('should return NOT_FOUND for another user\'s scene', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await scoreCandidatesAction(sceneId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })

    describe('addCandidateAction', () => {
        it('should add the signed-in user\'s location as a candidate on their scene', async () => {
            // Act
            const candidate = expectSuccess(await addCandidateAction(sceneId, spareLocationId, projectId, []))

            // Assert
            expect(candidate.sceneId).toBe(sceneId)
            expect(candidate.locationId).toBe(spareLocationId)
            expect(revalidatePath).toHaveBeenCalledWith(`/productions/${projectId}/scenes/${sceneId}`)
        })

        it('should not add a candidate to another user\'s scene', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await addCandidateAction(sceneId, intruderLocationId, projectId, []))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(await prisma.candidate.count({ where: { sceneId } })).toBe(1)
        })

        it('should not add another user\'s location as a candidate', async () => {
            // Act
            const result = expectFailure(await addCandidateAction(sceneId, intruderLocationId, projectId, []))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(await prisma.candidate.count({ where: { sceneId } })).toBe(1)
        })
    })

    describe('toggleCandidateSelectedAction', () => {
        it('should select the signed-in user\'s candidate', async () => {
            // Act
            const candidate = expectSuccess(await toggleCandidateSelectedAction(candidateId, true, sceneId, projectId))

            // Assert
            expect(candidate.selected).toBe(true)
        })

        it('should not select another user\'s candidate', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await toggleCandidateSelectedAction(candidateId, true, sceneId, projectId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } })
            expect(candidate!.selected).toBe(false)
        })
    })

    describe('removeCandidateAction', () => {
        it('should remove the signed-in user\'s candidate', async () => {
            // Act
            expectSuccess(await removeCandidateAction(candidateId, sceneId, projectId))

            // Assert
            expect(await prisma.candidate.findUnique({ where: { id: candidateId } })).toBeNull()
        })

        it('should not remove another user\'s candidate', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await removeCandidateAction(candidateId, sceneId, projectId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(await prisma.candidate.findUnique({ where: { id: candidateId } })).not.toBeNull()
        })
    })

    describe('getRecommendationsAction', () => {
        it('should only recommend the signed-in user\'s locations', async () => {
            // Act
            const recommendations = expectSuccess(await getRecommendationsAction(sceneId))

            // Assert
            const recommendedIds = recommendations.map(r => r.locationId)
            expect(recommendedIds).toEqual(expect.arrayContaining([candidateLocationId, spareLocationId]))
            expect(recommendedIds).not.toContain(intruderLocationId)
        })

        it('should return NOT_FOUND for another user\'s scene', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await getRecommendationsAction(sceneId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })
})
