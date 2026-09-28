// src/app/services/recommendationService.ts

import { prisma as defaultPrisma } from '@/lib/prisma'
import { PrismaClient, LocationStatus } from '@prisma/client'
import { scoreLocation } from '@/services/scoringService'
import { ErrorCode, Result } from '@/schemas/result'

type ScoredLocation = {
    locationId: string
    locationName: string
    score: number
}

// Recommendations only draw from the user's own location library, for a scene
// whose parent project the user owns.
export async function getRecommendations(
    userId: string,
    sceneId: string,
    options?: { db?: PrismaClient; limit?: number }
): Promise<Result<ScoredLocation[]>> {
    const db = options?.db ?? defaultPrisma
    const limit = options?.limit ?? 3

    try {
        // 1. Load scene with project
        const scene = await db.scene.findUnique({
            where: { id: sceneId, project: { userId } },
            include: { project: true },
        })

        if (!scene) {
            return { success: false, code: ErrorCode.NOT_FOUND, error: `Scene not found: ${sceneId}` }
        }

        const projectCoords =
            scene.project.latitude != null && scene.project.longitude != null
                ? { lat: scene.project.latitude, lng: scene.project.longitude }
                : null

        // 2. Load the user's active locations with photo counts
        const locations = await db.location.findMany({
            where: { userId, status: LocationStatus.ACTIVE },
            include: {
                _count: { select: { photos: true } },
            },
        })

        // 3. Batch-fetch historical candidate counts per location
        const historicalCounts = await db.candidate.groupBy({
            by: ['locationId'],
            where: {
                locationId: { in: locations.map(l => l.id) },
                scene: { project: { userId } },
                selected: true,
            },
            _count: { id: true },
        })

        const countMap = new Map(
            historicalCounts.map(h => [h.locationId, h._count.id])
        )

        // 4. Score each location
        const scored: ScoredLocation[] = locations.map(loc => {
            const locationCoords =
                loc.latitude != null && loc.longitude != null
                    ? { lat: loc.latitude, lng: loc.longitude }
                    : null

            const score = scoreLocation(
                scene.keywords,
                loc.keywords,
                projectCoords,
                locationCoords,
                countMap.get(loc.id) ?? 0,
                loc._count.photos,
            )

            return {
                locationId: loc.id,
                locationName: loc.name,
                score,
            }
        })

        // 5. Sort descending, return top N
        scored.sort((a, b) => b.score - a.score)

        return { success: true, data: scored.slice(0, limit) }

    } catch (error) {
        console.error(`Failed to generate recommendations for scene: ${sceneId}`, error)
        return { success: false, error: `Failed to generate recommendations` }
    }
}

export async function scoreCandidates(
    userId: string,
    sceneId: string,
    options?: { db?: PrismaClient }
): Promise<Result<Map<string, number>>> {
    const db = options?.db ?? defaultPrisma

    try {
        const scene = await db.scene.findUnique({
            where: { id: sceneId, project: { userId } },
            include: {
                project: true,
                candidates: {
                    where: { location: { userId } },
                    include: {
                        location: {
                            include: { _count: { select: { photos: true } } },
                        },
                    },
                },
            },
        })

        if (!scene) {
            return { success: false, code: ErrorCode.NOT_FOUND, error: `Scene not found: ${sceneId}` }
        }

        const projectCoords =
            scene.project.latitude != null && scene.project.longitude != null
                ? { lat: scene.project.latitude, lng: scene.project.longitude }
                : null

        const locationIds = scene.candidates.map(c => c.locationId)

        const historicalCounts = await db.candidate.groupBy({
            by: ['locationId'],
            where: {
                locationId: { in: locationIds },
                scene: { project: { userId } },
                selected: true,
            },
            _count: { id: true },
        })

        const countMap = new Map(
            historicalCounts.map(h => [h.locationId, h._count.id])
        )

        const scores = new Map<string, number>()

        for (const candidate of scene.candidates) {
            const loc = candidate.location
            const locationCoords =
                loc.latitude != null && loc.longitude != null
                    ? { lat: loc.latitude, lng: loc.longitude }
                    : null

            scores.set(
                candidate.id,
                scoreLocation(
                    scene.keywords,
                    loc.keywords,
                    projectCoords,
                    locationCoords,
                    countMap.get(loc.id) ?? 0,
                    loc._count.photos,
                )
            )
        }

        return { success: true, data: scores }

    } catch (error) {
        console.error(`Failed to score candidates for scene: ${sceneId}`, error)
        return { success: false, error: `Failed to score candidates` }
    }
}