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
    // TODO: Implement Prisma aggregation queries
    throw new Error('Not implemented')
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
    // TODO: Implement — join Scene → Candidate → Location, select distinct lat/lng
    throw new Error('Not implemented')
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
    // TODO: Implement — could do this with a single query using Prisma's _count
    // on the candidates relation, then bucket in JS
    throw new Error('Not implemented')
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
    // TODO: Implement
    throw new Error('Not implemented')
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
    // TODO: Implement
    throw new Error('Not implemented')
}