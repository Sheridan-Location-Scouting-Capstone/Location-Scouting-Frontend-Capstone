import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from './setup'
import { getRecommendations, scoreCandidates } from '@/app/services/recommendationService'

// ─── Helpers ────────────────────────────────────────────────

async function createProject(overrides?: Partial<Parameters<typeof prisma.project.create>[0]['data']>) {
    return prisma.project.create({
        data: {
            name: 'Test Production',
            address: '100 Queen St W',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5H 2N2',
            latitude: 43.6532,
            longitude: -79.3832,
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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma, limit: 2 })

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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data[0].score).toBeGreaterThan(0)
    })

    it('should return error for non-existent scene', async () => {
        // Act
        const result = await getRecommendations('non-existent-id', { db: prisma })

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
        const result = await getRecommendations(scene.id, { db: prisma })

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
        const result = await scoreCandidates(scene.id, { db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return

        expect(result.data.has(c1.id)).toBe(true)
        expect(result.data.has(c2.id)).toBe(true)
        expect(result.data.get(c1.id)).toBeGreaterThan(0)
        expect(result.data.get(c2.id)).toBeGreaterThan(0)
    })

    it('should return error for non-existent scene', async () => {
        const result = await scoreCandidates('non-existent-id', { db: prisma })

        expect(result.success).toBe(false)
    })

    it('should return empty map when scene has no candidates', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)

        // Act
        const result = await scoreCandidates(scene.id, { db: prisma })

        // Assert
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.size).toBe(0)
    })
})