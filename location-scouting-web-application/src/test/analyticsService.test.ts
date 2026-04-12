import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@/app/lib/prisma'
import {
    getAnalyticsSummary,
    getLocationPoints,
    getSceneCoverage,
    getKeywordGaps,
    getKeywordDistribution,
} from '@/app/services/analyticsService'

// ─── Fixture ────────────────────────────────────────────────
// Creates a known dataset:
//   Project with 4 scenes:
//     Scene 1 (INT):  keywords [kitchen, vintage, residential]  → has selected candidate (Location A)
//     Scene 2 (EXT):  keywords [urban, alley, industrial]       → has candidate, not selected (Location B)
//     Scene 3 (EXT):  keywords [rural, field]                   → no candidates
//     Scene 4 (INT_EXT): keywords [urban, rooftop]              → has candidate, not selected (Location B)
//
//   3 Locations (all ACTIVE):
//     Location A: keywords [kitchen, vintage, cozy]       lat/lng: 43.45, -79.68
//     Location B: keywords [urban, alley, brick]          lat/lng: 43.65, -79.38
//     Location C: keywords [park, outdoor]                lat/lng: null, null  (no coords)
//
//   Expected results:
//     totalScenes: 4, intCount: 1, extCount: 2, intExtCount: 1
//     scenesWithCandidates: 3 (scenes 1, 2, 4)
//     scenesWithSelected: 1 (scene 1)
//     locationPoints: 2 (A and B, C excluded for null coords)
//     coverage: { selected: 1, candidateOnly: 2, noCandidates: 1 }
//     uniqueKeywords: 9 (kitchen, vintage, residential, urban, alley, industrial, rural, field, rooftop)
//     matched keywords: 4 (kitchen, vintage, urban, alley — exist in location library)
//     unmatched keywords: 5 (residential, industrial, rural, field, rooftop)
//     gaps sorted: industrial(1), residential(1), rural(1), field(1), rooftop(1)
//     distribution top: urban(2), then everything else at 1

type FixtureIds = {
    projectId: string
}

async function buildAnalyticsFixture(db: typeof prisma): Promise<FixtureIds> {

    const project = await db.project.create({
        data: {
            name: 'Analytics Test Production',
            address: '123 Main St',
            city: 'Oakville',
            province: 'ON',
            country: 'Canada',
            postalCode: 'L6H 0Y1'
        }
    })

    const [locA, locB, locC] = await Promise.all([
        db.location.create({
            data: {
                name: 'Test House',
                address: '123 Main St',
                city: 'Oakville',
                province: 'ON',
                country: 'Canada',
                postalCode: 'L6H 0Y1',
                keywords: ['kitchen', 'vintage', 'cozy'],
                latitude: 43.45,
                longitude: -79.68,
                status: 'ACTIVE',
            },
        }),
        db.location.create({
            data: {
                name: 'Downtown Alley',
                address: '456 Queen St',
                city: 'Toronto',
                province: 'ON',
                country: 'Canada',
                postalCode: 'L6H 0Y1',
                keywords: ['urban', 'alley', 'brick'],
                latitude: 43.65,
                longitude: -79.38,
                status: 'ACTIVE',
            },
        }),
        db.location.create({
            data: {
                name: 'City Park',
                address: '789 Park Ave',
                city: 'Mississauga',
                province: 'ON',
                country: 'Canada',
                postalCode: 'L6H 0Y1',
                keywords: ['park', 'outdoor'],
                status: 'ACTIVE',
                // no lat/lng — should be excluded from location points
            },
        }),
    ])

    const [scene1, scene2, scene3, scene4] = await Promise.all([
        db.scene.create({
            data: {
                sceneNumber: 1,
                sceneLocation: 'KITCHEN',
                scriptSection: 'Interior kitchen scene',
                intExt: 'INT',
                keywords: ['kitchen', 'vintage', 'residential'],
                projectId: project.id,
            },
        }),
        db.scene.create({
            data: {
                sceneNumber: 2,
                sceneLocation: 'ALLEY',
                scriptSection: 'Exterior alley scene',
                intExt: 'EXT',
                keywords: ['urban', 'alley', 'industrial'],
                projectId: project.id,
            },
        }),
        db.scene.create({
            data: {
                sceneNumber: 3,
                sceneLocation: 'FIELD',
                scriptSection: 'Exterior field scene',
                intExt: 'EXT',
                keywords: ['rural', 'field'],
                projectId: project.id,
            },
        }),
        db.scene.create({
            data: {
                sceneNumber: 4,
                sceneLocation: 'ROOFTOP',
                scriptSection: 'Rooftop scene',
                intExt: 'INT_EXT',
                keywords: ['urban', 'rooftop'],
                projectId: project.id,
            },
        }),
    ])

    // Scene 1 → Location A (selected)
    await db.candidate.create({
        data: {
            sceneId: scene1.id,
            locationId: locA.id,
            selected: true,
        },
    })

    // Scene 2 → Location B (not selected)
    await db.candidate.create({
        data: {
            sceneId: scene2.id,
            locationId: locB.id,
            selected: false,
        },
    })

    // Scene 4 → Location B (not selected, same location as scene 2)
    await db.candidate.create({
        data: {
            sceneId: scene4.id,
            locationId: locB.id,
            selected: false,
        },
    })

    // Scene 3 has no candidates

    return { projectId: project.id }
}

// ─── Tests ──────────────────────────────────────────────────

describe('Analytics Service', () => {
    let projectId: string

    // Arrange
    beforeAll(async () => {
        const fixture = await buildAnalyticsFixture(prisma)
        projectId = fixture.projectId
    })

    describe('getAnalyticsSummary', () => {
        it('should return correct scene counts and keyword stats', async () => {
            // Act
            const result = await getAnalyticsSummary(projectId, { db: prisma })
            expect(result.success).toBe(true)
            if (!result.success) return

            // Assert
            expect(result.data.totalScenes).toBe(4)
            expect(result.data.intCount).toBe(1)
            expect(result.data.extCount).toBe(2)
            expect(result.data.intExtCount).toBe(1)
            expect(result.data.scenesWithCandidates).toBe(3)
            expect(result.data.scenesWithSelected).toBe(1)
            expect(result.data.uniqueKeywords).toBe(9)
            expect(result.data.matchedKeywords).toBe(4)
            expect(result.data.unmatchedKeywords).toBe(5)
        })
    })

    describe('getLocationPoints', () => {
        it('should return deduplicated coordinates excluding null lat/lng', async () => {
            const result = await getLocationPoints(projectId, { db: prisma })
            expect(result.success).toBe(true)
            if (!result.success) return

            // Location A and B have coords, C does not
            // Location B is candidate for 2 scenes but should appear once
            expect(result.data).toHaveLength(2)
            expect(result.data).toContainEqual({ latitude: 43.45, longitude: -79.68 })
            expect(result.data).toContainEqual({ latitude: 43.65, longitude: -79.38 })
        })
    })

    describe('getSceneCoverage', () => {
        it('should bucket scenes into selected, candidateOnly, and noCandidates', async () => {
            const result = await getSceneCoverage(projectId, { db: prisma })
            expect(result.success).toBe(true)
            if (!result.success) return

            expect(result.data.selected).toBe(1)       // scene 1
            expect(result.data.candidateOnly).toBe(2)   // scenes 2 and 4
            expect(result.data.noCandidates).toBe(1)     // scene 3
        })
    })

    describe('getKeywordGaps', () => {
        it('should return scene keywords not found in any active location', async () => {
            const result = await getKeywordGaps(projectId, { db: prisma })
            expect(result.success).toBe(true)
            if (!result.success) return

            const keywords = result.data.map((g) => g.keyword.toLowerCase())
            expect(keywords).toContain('residential')
            expect(keywords).toContain('industrial')
            expect(keywords).toContain('rural')
            expect(keywords).toContain('field')
            expect(keywords).toContain('rooftop')
            expect(keywords).not.toContain('kitchen')  // matched by Location A
            expect(keywords).not.toContain('urban')     // matched by Location B
        })

        it('should be sorted by sceneCount descending', async () => {
            const result = await getKeywordGaps(projectId, { db: prisma })
            if (!result.success) return

            for (let i = 1; i < result.data.length; i++) {
                expect(result.data[i - 1].sceneCount).toBeGreaterThanOrEqual(
                    result.data[i].sceneCount
                )
            }
        })
    })

    describe('getKeywordDistribution', () => {
        it('should return keyword frequencies sorted descending', async () => {
            const result = await getKeywordDistribution(projectId, 10, { db: prisma })
            expect(result.success).toBe(true)
            if (!result.success) return

            // "urban" appears in scenes 2 and 4, so it should be first
            expect(result.data[0].keyword.toLowerCase()).toBe('urban')
            expect(result.data[0].sceneCount).toBe(2)

            // All others appear in 1 scene each
            for (let i = 1; i < result.data.length; i++) {
                expect(result.data[i].sceneCount).toBe(1)
            }
        })

        it('should respect the limit parameter', async () => {
            const result = await getKeywordDistribution(projectId, 3, { db: prisma })
            if (!result.success) return

            expect(result.data.length).toBeLessThanOrEqual(3)
        })
    })
})