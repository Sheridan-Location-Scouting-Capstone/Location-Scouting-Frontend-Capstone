import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../setup'
import { getRecommendations, scoreCandidates } from '@/services/recommendationService'
import { signUpSetup } from '@/test/e2e/fixtures'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { ErrorCode } from '@/schemas/result'
import {toggleCandidateSelected} from "@/services/candidateService";

// ─── Helpers ────────────────────────────────────────────────

// The signed-in user for each test. Helpers create records owned by this user unless told otherwise.
let userId: string

beforeEach(async () => {
    userId = (await signUpSetup()).userId
})

async function createProject(overrides?: Record<string, unknown>) {
    return prisma.project.create({
        data: {
            name: 'Test Production',
            address: '100 Queen St W',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5H 2N2',
            latitude: 43.6532,
            longitude: -79.3832,
            userId,
            ...overrides,
        },
    })
}

async function createScene(projectId: string, overrides?: Record<string, unknown>) {
    return prisma.scene.create({
        data: {
            sceneNumber: 1,
            sceneLocation: 'KITCHEN',
            scriptSection: 'Act 1',
            keywords: ['kitchen', 'modern', 'suburban'],
            projectId,
            ...overrides,
        },
    })
}

async function createLocation(overrides?: Record<string, unknown>) {
    return prisma.location.create({
        data: {
            name: 'Test Location',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1',
            keywords: [],
            userId,
            ...overrides,
        },
    })
}

async function createCandidate(sceneId: string, locationId: string, selected = false) {
    return prisma.candidate.create({
        data: { sceneId, locationId, selected },
    })
}

async function addPhotos(locationId: string, count: number) {
    for (let i = 0; i < count; i++) {
        await prisma.photo.create({
            data: {
                url: `http://minio/test-${i}.jpg`,
                storageKey: `test-${locationId}-${i}`,
                locationId,
            },
        })
    }
}

// ─── getRecommendations ─────────────────────────────────────

describe('getRecommendations', () => {
    it('should return locations ranked by score descending', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, {
            keywords: ['kitchen', 'modern', 'suburban'],
        })

        // High keyword overlap
        const bestMatch = await createLocation({
            name: 'Perfect Kitchen',
            keywords: ['kitchen', 'modern', 'suburban', 'spacious'],
            latitude: 43.66,
            longitude: -79.39,
        })

        // Low keyword overlap
        const weakMatch = await createLocation({
            name: 'Random Warehouse',
            keywords: ['warehouse', 'industrial'],
            latitude: 43.67,
            longitude: -79.40,
        })

        // Partial overlap
        const midMatch = await createLocation({
            name: 'Old Kitchen',
            keywords: ['kitchen', 'vintage'],
            latitude: 43.65,
            longitude: -79.38,
        })

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return

        expect(result.data[0].locationId).toBe(bestMatch.id)
        expect(result.data[0].score).toBeGreaterThan(result.data[1].score)
        expect(result.data[1].score).toBeGreaterThan(result.data[2].score)
    })

    it('should respect the limit parameter', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)

        for (let i = 0; i < 5; i++) {
            await createLocation({ name: `Location ${i}`, keywords: ['kitchen'] })
        }

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma, limit: 2 })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data).toHaveLength(2)
    })

    it('should default to 3 results', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)

        for (let i = 0; i < 5; i++) {
            await createLocation({ name: `Location ${i}`, keywords: ['kitchen'] })
        }

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data).toHaveLength(3)
    })

    it('should exclude DELETED and ARCHIVED locations', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })

        await createLocation({ name: 'Active', keywords: ['kitchen'], status: 'ACTIVE' })
        await createLocation({ name: 'Deleted', keywords: ['kitchen'], status: 'DELETED' })
        await createLocation({ name: 'Archived', keywords: ['kitchen'], status: 'ARCHIVED' })

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data).toHaveLength(1)
        expect(result.data[0].locationName).toBe('Active')
    })

    it('should boost locations with more historical selections', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })

        // Both have identical keywords and coordinates
        const popular = await createLocation({
            name: 'Popular Spot',
            keywords: ['kitchen'],
            latitude: 43.66,
            longitude: -79.39,
        })
        const fresh = await createLocation({
            name: 'New Spot',
            keywords: ['kitchen'],
            latitude: 43.66,
            longitude: -79.39,
        })

        // Give the popular location several selected candidates on other scenes
        const otherScene = await createScene(project.id, {
            sceneNumber: 2,
            sceneLocation: 'LIVING ROOM',
            keywords: ['living room'],
        })
        for (let i = 0; i < 4; i++) {
            const s = await createScene(project.id, {
                sceneNumber: 10 + i,
                sceneLocation: `ROOM ${i}`,
                keywords: [],
            })
            await createCandidate(s.id, popular.id, true)
        }

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return

        const popularScore = result.data.find(r => r.locationId === popular.id)
        const freshScore = result.data.find(r => r.locationId === fresh.id)
        expect(popularScore).toBeDefined()
        expect(freshScore).toBeDefined()
        expect(popularScore!.score).toBeGreaterThan(freshScore!.score)
    })

    it('should boost locations with more photos', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })

        const manyPhotos = await createLocation({
            name: 'Well Documented',
            keywords: ['kitchen'],
            latitude: 43.66,
            longitude: -79.39,
        })
        const noPhotos = await createLocation({
            name: 'No Photos',
            keywords: ['kitchen'],
            latitude: 43.66,
            longitude: -79.39,
        })

        await addPhotos(manyPhotos.id, 10)

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return

        const documented = result.data.find(r => r.locationId === manyPhotos.id)
        const bare = result.data.find(r => r.locationId === noPhotos.id)
        expect(documented!.score).toBeGreaterThan(bare!.score)
    })

    it('should prefer closer locations over distant ones', async () => {
        // Arrange — project in Toronto
        const project = await createProject({
            latitude: 43.6532,
            longitude: -79.3832,
        })
        const scene = await createScene(project.id, { keywords: ['kitchen'] })

        // Nearby — Oakville
        const nearby = await createLocation({
            name: 'Oakville Kitchen',
            keywords: ['kitchen'],
            latitude: 43.4675,
            longitude: -79.6877,
        })

        // Far — Ottawa
        const far = await createLocation({
            name: 'Ottawa Kitchen',
            keywords: ['kitchen'],
            latitude: 45.4215,
            longitude: -75.6972,
        })

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return

        const nearbyScore = result.data.find(r => r.locationId === nearby.id)
        const farScore = result.data.find(r => r.locationId === far.id)
        expect(nearbyScore!.score).toBeGreaterThan(farScore!.score)
    })

    it('should handle locations with null coordinates gracefully', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })

        await createLocation({
            name: 'No Coords',
            keywords: ['kitchen'],
            latitude: null,
            longitude: null,
        })

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data).toHaveLength(1)
        expect(result.data[0].score).toBeGreaterThan(0) // keyword match still contributes
    })

    it('should handle project with null coordinates gracefully', async () => {
        // Arrange
        const project = await createProject({ latitude: null, longitude: null })
        const scene = await createScene(project.id, { keywords: ['kitchen'] })

        await createLocation({
            name: 'Has Coords',
            keywords: ['kitchen'],
            latitude: 43.66,
            longitude: -79.39,
        })

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data[0].score).toBeGreaterThan(0)
    })

    it('should return error for non-existent scene', async () => {
        // Act
        const result = await getRecommendations(userId, 'non-existent-id',{ db: prisma })

        // Assert
        expect(result.success).toBe(false)
        if (result.success) return
        expect(result.error).toContain('Scene not found')
    })

    it('should return empty array when no locations exist', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)

        // Act
        const result = await getRecommendations(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data).toHaveLength(0)
    })
})

// ─── scoreCandidates ────────────────────────────────────────

describe('scoreCandidates', () => {
    it('should return a score for each candidate keyed by candidate id', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen', 'modern'] })

        const loc1 = await createLocation({ name: 'Loc 1', keywords: ['kitchen'] })
        const loc2 = await createLocation({ name: 'Loc 2', keywords: ['modern'] })

        const c1 = await createCandidate(scene.id, loc1.id)
        const c2 = await createCandidate(scene.id, loc2.id)

        // Act
        const result = await scoreCandidates(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return

        expect(result.data.has(c1.id)).toBe(true)
        expect(result.data.has(c2.id)).toBe(true)
        expect(result.data.get(c1.id)).toBeGreaterThan(0)
        expect(result.data.get(c2.id)).toBeGreaterThan(0)
    })

    it('should return error for non-existent scene', async () => {
        const result = await scoreCandidates(userId, 'non-existent-id',{ db: prisma })

        expect(result.success).toBe(false)
    })

    it('should return empty map when scene has no candidates', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)

        // Act
        const result = await scoreCandidates(userId, scene.id,{ db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.size).toBe(0)
    })

    it('ignores a locations selection for the scene being scored', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })
        const location = await createLocation({ name: 'Loc', keywords: ['kitchen'] })
        const candidate = await createCandidate(scene.id, location.id, false)
        const result = expectSuccess(await scoreCandidates(userId, scene.id,{ db: prisma }))
        const scoreBeforeSelection = result.get(candidate.id);


        // Act
        expectSuccess(await toggleCandidateSelected(userId, candidate.id, true,{ db: prisma }))

        const scoreAfterSelection = expectSuccess(await scoreCandidates(userId, scene.id,{ db: prisma })).get(candidate.id);

        // Assert
        expect(scoreBeforeSelection).toBeDefined();
        expect(scoreAfterSelection).toBeDefined();
        expect(scoreBeforeSelection).toEqual(scoreAfterSelection);
    })

    it('counts selections of the location for other scenes', async () => {
        // Arrange
        const project = await createProject()
        const scene1 = await createScene(project.id, { keywords: ['kitchen'] })
        const scene2 = await createScene(project.id, { keywords: ['kitchen'] })
        const location = await createLocation({ name: 'Loc', keywords: ['kitchen'] })
        const candidate1 = await createCandidate(scene1.id, location.id, true)
        const candidate2 = await createCandidate(scene2.id, location.id, false)

        const resultBeforeSelection = expectSuccess(await scoreCandidates(userId, scene2.id,{ db: prisma }))
        const scoreBeforeSelection = resultBeforeSelection.get(candidate2.id);

        // Act
        expectSuccess(await toggleCandidateSelected(userId, candidate1.id, true,{ db: prisma }))

        const resultAfterSelection = expectSuccess(await scoreCandidates(userId, scene2.id,{ db: prisma }))
        const scoreAfterSelection = resultAfterSelection.get(candidate2.id);

        // Assert
        expect(scoreBeforeSelection).toBeDefined();
        expect(scoreAfterSelection).toBeDefined();
        if (scoreBeforeSelection === undefined || scoreAfterSelection === undefined) {
            throw new Error('Scores should not be undefined');
        }
        expect(scoreAfterSelection).toBeGreaterThan(scoreBeforeSelection);
    })

})

// ─── User isolation ─────────────────────────────────────────

describe('Recommendation user isolation', () => {
    let intruderId: string

    beforeEach(async () => {
        intruderId = (await signUpSetup()).userId
    })

    it('getRecommendations should return NOT_FOUND for a scene in another user\'s project', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })
        await createLocation({ name: 'Owner Kitchen', keywords: ['kitchen'] })

        // Act
        const result = expectFailure(await getRecommendations(intruderId, scene.id, { db: prisma }))

        // Assert
        expect(result.code).toBe(ErrorCode.NOT_FOUND)
    })

    it('getRecommendations should only recommend the user\'s own locations', async () => {
        // Arrange - owner scene, plus a perfectly matching location in another user's library
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen', 'modern'] })
        const ownLocation = await createLocation({ name: 'Own Spot', keywords: ['kitchen'] })
        await createLocation({ name: 'Intruder Perfect Match', keywords: ['kitchen', 'modern'], userId: intruderId })

        // Act
        const result = expectSuccess(await getRecommendations(userId, scene.id, { db: prisma, limit: 10 }))

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0].locationId).toBe(ownLocation.id)
    })

    it('getRecommendations should ignore another user\'s selections when computing historical score', async () => {
        // Arrange - two identical owner locations
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })
        const first = await createLocation({ name: 'First', keywords: ['kitchen'], latitude: 43.66, longitude: -79.39 })
        const second = await createLocation({ name: 'Second', keywords: ['kitchen'], latitude: 43.66, longitude: -79.39 })

        // Seed candidate rows directly (bypassing the service) that pair another user's scenes with
        // the owner's first location. The service must not count these toward the owner's history.
        const intruderProject = await createProject({ userId: intruderId })
        for (let i = 0; i < 4; i++) {
            const s = await createScene(intruderProject.id, { sceneNumber: 10 + i, keywords: [] })
            await createCandidate(s.id, first.id, true)
        }

        // Act
        const result = expectSuccess(await getRecommendations(userId, scene.id, { db: prisma }))

        // Assert
        const firstScore = result.find(r => r.locationId === first.id)!.score
        const secondScore = result.find(r => r.locationId === second.id)!.score
        expect(firstScore).toBe(secondScore)
    })

    it('scoreCandidates should return NOT_FOUND for a scene in another user\'s project', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ keywords: ['kitchen'] })
        await createCandidate(scene.id, location.id)

        // Act
        const result = expectFailure(await scoreCandidates(intruderId, scene.id, { db: prisma }))

        // Assert
        expect(result.code).toBe(ErrorCode.NOT_FOUND)
    })

    it('scoreCandidates should not score candidates whose location belongs to another user', async () => {
        // Arrange - a candidate row linking the owner's scene to another user's location
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen'] })
        const own = await createLocation({ keywords: ['kitchen'] })
        const foreign = await createLocation({ keywords: ['kitchen'], userId: intruderId })
        const ownCandidate = await createCandidate(scene.id, own.id)
        const foreignCandidate = await createCandidate(scene.id, foreign.id)

        // Act
        const result = expectSuccess(await scoreCandidates(userId, scene.id, { db: prisma }))

        // Assert
        expect(result.has(ownCandidate.id)).toBe(true)
        expect(result.has(foreignCandidate.id)).toBe(false)
    })
})