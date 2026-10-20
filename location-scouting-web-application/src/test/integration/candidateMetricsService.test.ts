import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '../setup'
import { getKeywordOverlap, getNearestSelectedDistance } from '@/services/candidateMetricsService'
import { signUpSetup } from '@/test/e2e/fixtures'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { ErrorCode } from '@/schemas/result'
import { Coordinate, RoutingService } from '@/schemas/routing'

// ─── Helpers ────────────────────────────────────────────────

// The signed-in user for each test. Helpers create records owned by this user unless told otherwise.
let userId: string

beforeEach(async () => {
    userId = (await signUpSetup()).userId
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

async function createProject(overrides?: Record<string, unknown>) {
    return prisma.project.create({
        data: {
            name: 'Test Production',
            address: '100 Queen St W',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5H 2N2',
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
            keywords: [],
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

// ─── getKeywordOverlap ──────────────────────────────────────

describe('getKeywordOverlap', () => {
    it('should return no matched keywords when the location shares none with the scene', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['kitchen', 'modern', 'suburban'] })
        const location = await createLocation({ name: 'Dockside Warehouse', keywords: ['warehouse', 'industrial'] })
        const candidate = await createCandidate(scene.id, location.id)

        // Act
        const result = await getKeywordOverlap(userId, candidate.id, { db: prisma })

        // Assert
        const overlap = expectSuccess(result)
        expect(overlap.matchedKeywords).toEqual([])
        expect(overlap.sceneKeywords).toEqual(['kitchen', 'modern', 'suburban'])
    })

    it('should return only the shared keywords, in scene order, when some match', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['porch', 'gothic', 'overgrown', 'lake'] })
        const location = await createLocation({ name: 'Lakeside Manor', keywords: ['lake', 'dock', 'gothic'] })
        const candidate = await createCandidate(scene.id, location.id)

        // Act
        const result = await getKeywordOverlap(userId, candidate.id, { db: prisma })

        // Assert
        const overlap = expectSuccess(result)
        expect(overlap.matchedKeywords).toEqual(['gothic', 'lake'])
        expect(overlap.sceneKeywords).toEqual(['porch', 'gothic', 'overgrown', 'lake'])
    })

    it('should match every scene keyword when the location has them all', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['diner', 'neon', 'retro'] })
        const location = await createLocation({ name: 'Starlight Diner', keywords: ['retro', 'neon', 'diner', 'booth'] })
        const candidate = await createCandidate(scene.id, location.id)

        // Act
        const result = await getKeywordOverlap(userId, candidate.id, { db: prisma })

        // Assert
        const overlap = expectSuccess(result)
        expect(overlap.matchedKeywords).toEqual(['diner', 'neon', 'retro'])
        expect(overlap.sceneKeywords).toEqual(['diner', 'neon', 'retro'])
    })

    it('should match keywords regardless of case and keep the scene casing', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['Rooftop', 'SKYLINE', 'night'] })
        const location = await createLocation({ name: 'King St Rooftop', keywords: ['rooftop', 'skyline', 'NIGHT'] })
        const candidate = await createCandidate(scene.id, location.id)

        // Act
        const result = await getKeywordOverlap(userId, candidate.id, { db: prisma })

        // Assert
        const overlap = expectSuccess(result)
        expect(overlap.matchedKeywords).toEqual(['Rooftop', 'SKYLINE', 'night'])
        expect(overlap.sceneKeywords).toEqual(['Rooftop', 'SKYLINE', 'night'])
    })

    it("should return NOT_FOUND for another user's candidate", async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id, { keywords: ['barn', 'farm'] })
        const location = await createLocation({ name: 'Red Barn', keywords: ['barn'] })
        const candidate = await createCandidate(scene.id, location.id)
        const intruderId = (await signUpSetup()).userId

        // Act
        const result = await getKeywordOverlap(intruderId, candidate.id, { db: prisma })

        // Assert
        expect(expectFailure(result).code).toBe(ErrorCode.NOT_FOUND)
    })
})

// ─── getNearestSelectedDistance ─────────────────────────────

describe('getNearestSelectedDistance', () => {
    it('should return null when nothing is locked in the production', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Harbourfront Pier', latitude: 43.6387, longitude: -79.3816 })
        const unlockedElsewhere = await createLocation({ name: 'Union Station', latitude: 43.6453, longitude: -79.3806 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, unlockedElsewhere.id, false)

        const routedTo: Coordinate[][] = []
        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => {
                routedTo.push(destinations)
                return destinations.map(() => ({ durationMin: 5, distanceKm: 2, estimated: false }))
            },
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toBeNull()
        expect(routedTo).toEqual([])
    })

    it('should return the only locked location with its route', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Distillery Lane', latitude: 43.6503, longitude: -79.3596 })
        const locked = await createLocation({ name: 'Casa Loma', latitude: 43.6780, longitude: -79.4094 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, locked.id, true)

        const routedFrom: Coordinate[] = []
        const routedTo: Coordinate[][] = []
        const router: RoutingService = {
            oneToMany: async (origin, destinations) => {
                routedFrom.push(origin)
                routedTo.push(destinations)
                return [{ durationMin: 14.5, distanceKm: 6.2, estimated: false }]
            },
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toEqual({
            nearestLocationId: locked.id,
            locationName: 'Casa Loma',
            distanceKm: 6.2,
            durationMin: 14.5,
            estimated: false,
        })
        expect(routedFrom).toEqual([{ lat: 43.6503, lng: -79.3596 }])
        expect(routedTo).toEqual([[{ lat: 43.6780, lng: -79.4094 }]])
    })

    it('should pick the locked location with the shortest drive time, not the shortest distance', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Kensington Market', latitude: 43.6547, longitude: -79.4005 })
        const highwayHop = await createLocation({ name: 'Humber Bay Park', latitude: 43.6226, longitude: -79.4794 })
        const downtownCrawl = await createLocation({ name: 'St Lawrence Market', latitude: 43.6487, longitude: -79.3716 })
        const farAway = await createLocation({ name: 'Scarborough Bluffs', latitude: 43.7064, longitude: -79.2316 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, highwayHop.id, true)
        await createCandidate(scene.id, downtownCrawl.id, true)
        await createCandidate(scene.id, farAway.id, true)

        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => destinations.map(({ lat }) => {
                if (lat === 43.6226) return { durationMin: 11, distanceKm: 9.8, estimated: false }  // Humber Bay
                if (lat === 43.6487) return { durationMin: 16, distanceKm: 3.1, estimated: false }  // St Lawrence
                return { durationMin: 32, distanceKm: 18.4, estimated: false }                       // Scarborough
            }),
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toEqual({
            nearestLocationId: highwayHop.id,
            locationName: 'Humber Bay Park',
            distanceKm: 9.8,
            durationMin: 11,
            estimated: false,
        })
    })

    it('should count a location locked in another scene of the same production', async () => {
        // Arrange
        const project = await createProject()
        const thisScene = await createScene(project.id, { sceneNumber: 3, sceneLocation: 'ALLEY' })
        const otherScene = await createScene(project.id, { sceneNumber: 7, sceneLocation: 'CHURCH' })
        const location = await createLocation({ name: 'Graffiti Alley', latitude: 43.6479, longitude: -79.3990 })
        const lockedInOtherScene = await createLocation({ name: 'St James Cathedral', latitude: 43.6505, longitude: -79.3740 })
        const candidate = await createCandidate(thisScene.id, location.id, false)
        await createCandidate(otherScene.id, lockedInOtherScene.id, true)

        const router: RoutingService = {
            oneToMany: async () => [{ durationMin: 8, distanceKm: 2.4, estimated: false }],
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toEqual({
            nearestLocationId: lockedInOtherScene.id,
            locationName: 'St James Cathedral',
            distanceKm: 2.4,
            durationMin: 8,
            estimated: false,
        })
    })

    it('should route to a location once when it is locked in several scenes', async () => {
        // Arrange
        const project = await createProject()
        const thisScene = await createScene(project.id, { sceneNumber: 1, sceneLocation: 'PARK' })
        const sceneTwo = await createScene(project.id, { sceneNumber: 2, sceneLocation: 'LIBRARY' })
        const sceneThree = await createScene(project.id, { sceneNumber: 3, sceneLocation: 'LIBRARY STEPS' })
        const location = await createLocation({ name: 'Trinity Bellwoods', latitude: 43.6473, longitude: -79.4136 })
        const lockedTwice = await createLocation({ name: 'Toronto Reference Library', latitude: 43.6719, longitude: -79.3869 })
        const candidate = await createCandidate(thisScene.id, location.id, false)
        await createCandidate(sceneTwo.id, lockedTwice.id, true)
        await createCandidate(sceneThree.id, lockedTwice.id, true)

        const routedTo: Coordinate[][] = []
        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => {
                routedTo.push(destinations)
                return destinations.map(() => ({ durationMin: 12, distanceKm: 4.7, estimated: false }))
            },
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)?.nearestLocationId).toBe(lockedTwice.id)
        expect(routedTo).toEqual([[{ lat: 43.6719, lng: -79.3869 }]])
    })

    it("should never return the candidate's own location, even when it is locked in another scene", async () => {
        // Arrange
        const project = await createProject()
        const thisScene = await createScene(project.id, { sceneNumber: 4, sceneLocation: 'LOBBY' })
        const otherScene = await createScene(project.id, { sceneNumber: 9, sceneLocation: 'LOBBY - NIGHT' })
        const location = await createLocation({ name: 'Royal York Lobby', latitude: 43.6455, longitude: -79.3817 })
        const otherLocked = await createLocation({ name: 'Old City Hall', latitude: 43.6525, longitude: -79.3817 })
        const candidate = await createCandidate(thisScene.id, location.id, false)
        await createCandidate(otherScene.id, location.id, true)
        await createCandidate(otherScene.id, otherLocked.id, true)

        const routedTo: Coordinate[][] = []
        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => {
                routedTo.push(destinations)
                return destinations.map(({ lat }) => lat === 43.6455
                    ? { durationMin: 0, distanceKm: 0, estimated: false }
                    : { durationMin: 6, distanceKm: 1.2, estimated: false })
            },
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)?.nearestLocationId).toBe(otherLocked.id)
        expect(routedTo).toEqual([[{ lat: 43.6525, lng: -79.3817 }]])
    })

    it('should ignore locations locked in a different production', async () => {
        // Arrange
        const project = await createProject({ name: 'Northern Lights' })
        const otherProject = await createProject({ name: 'Southern Comfort' })
        const scene = await createScene(project.id)
        const otherProjectScene = await createScene(otherProject.id)
        const location = await createLocation({ name: 'Evergreen Brick Works', latitude: 43.6846, longitude: -79.3652 })
        const lockedInOtherProject = await createLocation({ name: 'Cherry Beach', latitude: 43.6370, longitude: -79.3436 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(otherProjectScene.id, lockedInOtherProject.id, true)

        const routedTo: Coordinate[][] = []
        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => {
                routedTo.push(destinations)
                return destinations.map(() => ({ durationMin: 15, distanceKm: 7, estimated: false }))
            },
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toBeNull()
        expect(routedTo).toEqual([])
    })

    it('should skip locked locations without coordinates', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'High Park Gates', latitude: 43.6465, longitude: -79.4637 })
        const lockedWithoutCoordinates = await createLocation({ name: 'Ungeocoded Farmhouse' })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, lockedWithoutCoordinates.id, true)

        const routedTo: Coordinate[][] = []
        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => {
                routedTo.push(destinations)
                return destinations.map(() => ({ durationMin: 3, distanceKm: 1, estimated: false }))
            },
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toBeNull()
        expect(routedTo).toEqual([])
    })

    it("should return NOT_FOUND for another user's candidate", async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Private Estate', latitude: 43.7315, longitude: -79.3940 })
        const locked = await createLocation({ name: 'Sunnybrook Park', latitude: 43.7210, longitude: -79.3570 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, locked.id, true)
        const intruderId = (await signUpSetup()).userId

        const router: RoutingService = {
            oneToMany: async () => [{ durationMin: 9, distanceKm: 3.5, estimated: false }],
        }

        // Act
        const result = await getNearestSelectedDistance(intruderId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectFailure(result).code).toBe(ErrorCode.NOT_FOUND)
    })

    it('should return null when the candidate location has no coordinates', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Unmapped Warehouse' })
        const locked = await createLocation({ name: 'Liberty Village Loft', latitude: 43.6387, longitude: -79.4196 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, locked.id, true)

        const routedTo: Coordinate[][] = []
        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => {
                routedTo.push(destinations)
                return destinations.map(() => ({ durationMin: 10, distanceKm: 4, estimated: false }))
            },
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toBeNull()
        expect(routedTo).toEqual([])
    })

    it('should pick the shortest distance when every result is a distance-only estimate', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Yorkville Courtyard', latitude: 43.6709, longitude: -79.3933 })
        const nearer = await createLocation({ name: 'Queens Park', latitude: 43.6643, longitude: -79.3923 })
        const farther = await createLocation({ name: 'Leslieville Studio', latitude: 43.6626, longitude: -79.3312 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, farther.id, true)
        await createCandidate(scene.id, nearer.id, true)

        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => destinations.map(({ lat }) => lat === 43.6643
                ? { durationMin: null, distanceKm: 1.0, estimated: true }   // Queens Park
                : { durationMin: null, distanceKm: 6.9, estimated: true }), // Leslieville
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toEqual({
            nearestLocationId: nearer.id,
            locationName: 'Queens Park',
            distanceKm: 1.0,
            durationMin: null,
            estimated: true,
        })
    })

    it('should skip locked locations the router could not reach', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Riverdale Farm', latitude: 43.6672, longitude: -79.3614 })
        const unroutable = await createLocation({ name: 'Toronto Island Cottage', latitude: 43.6214, longitude: -79.3780 })
        const routable = await createLocation({ name: 'Danforth Storefront', latitude: 43.6777, longitude: -79.3510 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, unroutable.id, true)
        await createCandidate(scene.id, routable.id, true)

        const router: RoutingService = {
            oneToMany: async (_origin, destinations) => destinations.map(({ lat }) => lat === 43.6214
                ? null                                                    // Toronto Island
                : { durationMin: 7, distanceKm: 2.6, estimated: false }), // Danforth
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)?.nearestLocationId).toBe(routable.id)
    })

    it('should return null when the router could reach no locked location', async () => {
        // Arrange
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Mainland Dock', latitude: 43.6400, longitude: -79.3800 })
        const unroutable = await createLocation({ name: 'Ward Island Beach', latitude: 43.6310, longitude: -79.3510 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, unroutable.id, true)

        const router: RoutingService = {
            oneToMany: async () => [null],
        }

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma, router })

        // Assert
        expect(expectSuccess(result)).toBeNull()
    })

    it('should use the real routing service when no router is passed', async () => {
        // Arrange: with OSRM_URL unset the real service answers with its distance-only estimate, which is deterministic.
        // Spadina Loft → Queen St Studio is 1.3383 km in a straight line; × 1.35 detour index ≈ 1.8067 km by road.
        vi.stubEnv('OSRM_URL', '')
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const project = await createProject()
        const scene = await createScene(project.id)
        const location = await createLocation({ name: 'Spadina Loft', latitude: 43.6520, longitude: -79.3970 })
        const locked = await createLocation({ name: 'Queen St Studio', latitude: 43.6544, longitude: -79.3807 })
        const candidate = await createCandidate(scene.id, location.id, false)
        await createCandidate(scene.id, locked.id, true)

        // Act
        const result = await getNearestSelectedDistance(userId, candidate.id, { db: prisma })

        // Assert
        expect(expectSuccess(result)).toEqual({
            nearestLocationId: locked.id,
            locationName: 'Queen St Studio',
            distanceKm: expect.closeTo(1.8067, 3),
            durationMin: null,
            estimated: true,
        })
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('OSRM_URL is not set'))
    })
})
