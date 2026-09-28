import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/test/setup'
import * as analyticsActions from '@/actions/analyticsActions'
import { getProductionAnalyticsAction } from '@/actions/analyticsActions'
import { createProject } from '@/services/productionService'
import { createScene } from '@/services/sceneService'
import { createCandidate } from '@/services/candidateService'
import { setupUserWithLocations, signUpSetup } from '@/test/e2e/fixtures'
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
const noKeywords: KeywordGenerator = async () => ({ success: false, error: 'disabled in tests' })

describe('Analytics Actions', () => {
    let ownerId: string
    let intruderId: string
    let projectId: string
    let candidateLocationId: string

    beforeEach(async () => {
        vi.clearAllMocks()

        // Arrange - owner has a project with two scenes, one of which has a selected candidate
        const owner = await setupUserWithLocations(1)
        ownerId = owner.user.userId
        projectId = expectSuccess(await createProject(ownerId, buildProjectInput(), { db: prisma, geocoder: mockGeocoder })).id
        const sceneWithCandidate = expectSuccess(await createScene(ownerId, buildSceneInput(projectId, { sceneNumber: 1 }), { db: prisma, keywordGenerator: noKeywords }))
        await createScene(ownerId, buildSceneInput(projectId, { sceneNumber: 2 }), { db: prisma, keywordGenerator: noKeywords })
        candidateLocationId = owner.locations[0].id
        expectSuccess(await createCandidate(ownerId, { sceneId: sceneWithCandidate.id, locationId: candidateLocationId, selected: true }, { db: prisma }))

        intruderId = (await signUpSetup()).userId
        actAs(ownerId)
    })

    describe('authentication', () => {
        it.each(everyExportedAction(analyticsActions))('%s should require a signed-in user', async (_name, action) => {
            // Arrange
            actAsAnonymous()

            // Act & Assert
            await expect(action('any-id')).rejects.toThrow('UNAUTHENTICATED')
        })
    })

    describe('getProductionAnalyticsAction', () => {
        it('should return every analytics section for the signed-in user\'s production', async () => {
            // Arrange - location geocoding is fire-and-forget, so wait for its coordinates
            await vi.waitFor(async () => {
                const location = await prisma.location.findUnique({ where: { id: candidateLocationId } })
                expect(location!.latitude).not.toBeNull()
            })

            // Act
            const analytics = expectSuccess(await getProductionAnalyticsAction(projectId))

            // Assert
            expect(analytics.summary.totalScenes).toBe(2)
            expect(analytics.summary.scenesWithSelected).toBe(1)
            expect(analytics.sceneCoverage).toEqual({ selected: 1, candidateOnly: 0, noCandidates: 1 })
            expect(analytics.locationPoints).toEqual([{ latitude: 43.6532, longitude: -79.3832 }])
            expect(analytics.keywordGaps).toEqual([])
            expect(analytics.keywordDistribution).toEqual([])
        })

        it('should return NOT_FOUND for another user\'s production', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await getProductionAnalyticsAction(projectId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })
})
