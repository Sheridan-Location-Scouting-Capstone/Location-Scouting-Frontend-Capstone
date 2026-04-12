import {prisma} from '@/test/setup'
import {beforeEach, describe, expect, it, test, vi} from 'vitest'


import { prisma as defaultPrisma } from '@/app/lib/prisma'
import type {
    AnalyticsSummary,
    LocationPoint,
    SceneCoverage,
    KeywordGap,
    KeywordFrequency,
} from "@/app/productions/[id]/analytics/analytics.types";
import {IntExt} from "@prisma/client";

type Options = { db?: typeof defaultPrisma }

/**
 * Aggregate summary stats for a production's scenes.
 *
 * Queries needed:
 * - Count all scenes for the project
 * - Count scenes grouped by intExt (INT, EXT, INT_EXT)
 * - Count scenes that have at least one candidate (join through Candidate)
 * - Count scenes that have at least one candidate with selected=true
 * - Collect all unique keywords across scenes, then compare against
 *   all unique keywords across locations that are candidates in this project
 *   to get matched vs unmatched counts
 */
export async function getAnalyticsSummary(
    projectId: string,
    options?: Options
): Promise<{ success: true; data: AnalyticsSummary } | { success: false; error: string }> {
    const db = options?.db ?? defaultPrisma

    try {

        const scenes = await db.scene.findMany({
            where: {projectId: projectId}
        })

        const totalScenes = scenes.length
        const intCount = scenes.filter((e) => e.intExt === IntExt.INT).length
        const extCount = scenes.filter((e) => e.intExt === IntExt.EXT).length
        const intExtCount = scenes.filter((e) => e.intExt === IntExt.INT_EXT).length

        const scenesWithCandidates = await db.scene.count({
            where: {
                projectId: projectId,
                candidates: {
                    some: {}
                }
            }
        })

        const scenesWithSelected = await db.scene.count({
            where: {
                projectId: projectId,
                candidates: {
                    some: {selected: true}
                }
            }
        })

        const locationKeywords = await db.location.findMany({
            select: {
                keywords: true
            }
        })

        // Flatten all location keywords into one big set (case-insensitive)
        const normalizedLocationKeywords = new Set(locationKeywords.flatMap((kSet) => kSet.keywords.map((k) => k.toLowerCase())))

        // For each unique scene keyword, check if it exists in the library set
        const sceneKeywords = new Set(scenes.flatMap((s) => s.keywords.map((k) => k.toLowerCase())))

        const unmatchedKeywords = [...sceneKeywords].filter((kw) => !normalizedLocationKeywords.has(kw)).length
        const matchedKeywords = [...sceneKeywords].filter((kw) => normalizedLocationKeywords.has(kw)).length
        const uniqueKeywords = sceneKeywords.size

        return { success: true, data: {
                totalScenes,
                intCount,
                extCount,
                intExtCount,
                scenesWithCandidates,
                scenesWithSelected,
                uniqueKeywords,
                matchedKeywords,
                unmatchedKeywords
        }}
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to load analytics" }
    }

}

/**
 * Get lat/lng coordinates for all locations that are candidates
 * in any scene of this production.
 *
 * Query: scenes for project → candidates → locations,
 * filter out locations where latitude or longitude is null,
 * deduplicate by location ID (same location can be candidate for multiple scenes)
 */
export async function getLocationPoints(
    projectId: string,
    options?: Options
): Promise<{ success: true; data: LocationPoint[] } | { success: false; error: string }> {
    const db = options?.db ?? defaultPrisma

    const locations = await db.location.findMany({
        where: {
            status: 'ACTIVE',
            latitude: { not: null },
            longitude: { not: null },
            candidates: {
                some: {
                    scene: { projectId },
                },
            },
        },
        select: { latitude: true, longitude: true },
    })

    const data = locations.map((l) => ({
        latitude: l.latitude as number,
        longitude: l.longitude as number,
    }))

    return { success: true, data }
}

/**
 * Count scenes in three buckets:
 * - selected: has at least one candidate with selected=true
 * - candidateOnly: has candidates but none are selected
 * - noCandidates: zero candidates
 *
 * These three should sum to totalScenes.
 */
export async function getSceneCoverage(
    projectId: string,
    options?: Options
): Promise<{ success: true; data: SceneCoverage } | { success: false; error: string }> {
    const db = options?.db ?? defaultPrisma

    const [selected, candidateOnly, noCandidates] = await Promise.all([
        db.scene.count({
            where: { projectId, candidates: { some: { selected: true } } },
        }),
        db.scene.count({
            where: {
                projectId,
                candidates: { some: {}, none: { selected: true } },
            },
        }),
        db.scene.count({
            where: { projectId, candidates: { none: {} } },
        }),
    ])

    return { success: true, data: { selected, candidateOnly, noCandidates } }
}

/**
 * Find scene keywords that have NO matching keyword in any location
 * in the user's library.
 *
 * Algorithm:
 * 1. Collect all unique keywords from scenes in this project
 * 2. Collect all unique keywords from all ACTIVE locations (not just candidates)
 * 3. Diff: scene keywords not present in any location = gaps
 * 4. For each gap keyword, count how many scenes in this project use it
 * 5. Return sorted by sceneCount descending
 *
 * Note: keyword matching should be case-insensitive (same as Jaccard in scoring)
 */
export async function getKeywordGaps(
    projectId: string,
    options?: Options
): Promise<{ success: true; data: KeywordGap[] } | { success: false; error: string }> {
    const db = options?.db ?? defaultPrisma

    const [scenes, locations] = await Promise.all([
        db.scene.findMany({
            where: { projectId },
            select: { keywords: true },
        }),
        db.location.findMany({
            where: { status: 'ACTIVE' },
            select: { keywords: true },
        }),
    ])

    // Build a case-insensitive set of all keywords in the library
    const libraryKeywords = new Set(
        locations.flatMap((l) => l.keywords.map((k) => k.toLowerCase()))
    )

    // Count scene occurrences for each unmatched keyword
    // Map preserves the original casing of the first occurrence for display
    const gapCounts = new Map<string, { display: string; count: number }>()

    for (const scene of scenes) {
        // Dedupe within a single scene so one scene = one count per keyword
        const seenInScene = new Set<string>()
        for (const kw of scene.keywords) {
            const normalized = kw.toLowerCase()
            if (libraryKeywords.has(normalized)) continue
            if (seenInScene.has(normalized)) continue
            seenInScene.add(normalized)

            const existing = gapCounts.get(normalized)
            if (existing) {
                existing.count += 1
            } else {
                gapCounts.set(normalized, { display: kw, count: 1 })
            }
        }
    }

    const data: KeywordGap[] = Array.from(gapCounts.values())
        .map((v) => ({ keyword: v.display, sceneCount: v.count }))
        .sort((a, b) => b.sceneCount - a.sceneCount)

    return { success: true, data }
}

/**
 * Get the most common keywords across this production's scenes.
 *
 * Algorithm:
 * 1. Flatten all keywords from all scenes in the project
 * 2. Count frequency of each keyword (case-insensitive)
 * 3. Sort descending by count
 * 4. Return top N (caller decides N, default 10)
 *
 * The "Other" bucket aggregation happens at the page level, not here —
 * this just returns the sorted list and the page truncates + groups.
 */
export async function getKeywordDistribution(
    projectId: string,
    limit?: number,
    options?: Options
): Promise<{ success: true; data: KeywordFrequency[] } | { success: false; error: string }> {
    const db = options?.db ?? defaultPrisma

    const scenes = await db.scene.findMany({
        where: { projectId },
        select: { keywords: true },
    })

    // Count how many scenes contain each keyword (case-insensitive)
    const counts = new Map<string, { display: string; count: number }>()

    for (const scene of scenes) {
        const seenInScene = new Set<string>()
        for (const kw of scene.keywords) {
            const normalized = kw.toLowerCase()
            if (seenInScene.has(normalized)) continue
            seenInScene.add(normalized)

            const existing = counts.get(normalized)
            if (existing) {
                existing.count += 1
            } else {
                counts.set(normalized, { display: kw, count: 1 })
            }
        }
    }

    const data: KeywordFrequency[] = Array.from(counts.values())
        .map((v) => ({ keyword: v.display, sceneCount: v.count }))
        .sort((a, b) => b.sceneCount - a.sceneCount)
        .slice(0, limit)

    return { success: true, data }
}