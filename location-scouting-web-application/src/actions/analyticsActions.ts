'use server'

import {
    getAnalyticsSummary,
    getKeywordDistribution,
    getKeywordGaps,
    getLocationPoints,
    getSceneCoverage,
} from '@/services/analyticsService'
import { requireUser } from '@/lib/auth-session'
import { Result } from '@/schemas/result'
import { ProductionAnalytics } from '@/schemas/analytics'

const DEFAULT_KEYWORD_DISTRIBUTION_LIMIT = 10

// ─── Analytics ──────────────────────────────────────────────

export async function getProductionAnalyticsAction(
    projectId: string,
    keywordDistributionLimit: number = DEFAULT_KEYWORD_DISTRIBUTION_LIMIT
): Promise<Result<ProductionAnalytics>> {
    const user = await requireUser()

    const [summary, locationPoints, sceneCoverage, keywordGaps, keywordDistribution] = await Promise.all([
        getAnalyticsSummary(user.id, projectId),
        getLocationPoints(user.id, projectId),
        getSceneCoverage(user.id, projectId),
        getKeywordGaps(user.id, projectId),
        getKeywordDistribution(user.id, projectId, keywordDistributionLimit),
    ])

    if (!summary.success) return summary
    if (!locationPoints.success) return locationPoints
    if (!sceneCoverage.success) return sceneCoverage
    if (!keywordGaps.success) return keywordGaps
    if (!keywordDistribution.success) return keywordDistribution

    return {
        success: true,
        data: {
            summary: summary.data,
            locationPoints: locationPoints.data,
            sceneCoverage: sceneCoverage.data,
            keywordGaps: keywordGaps.data,
            keywordDistribution: keywordDistribution.data,
        },
    }
}
