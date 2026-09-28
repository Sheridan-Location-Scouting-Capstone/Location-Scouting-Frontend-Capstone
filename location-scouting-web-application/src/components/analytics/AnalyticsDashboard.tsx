'use client'

import { Box } from '@mui/material'
import type { ProductionAnalytics } from '@/schemas/analytics'
import StatCards from '@/components/analytics/StatCards'
import { Heatmap } from '@/components/analytics/Heatmap'
import SceneCoverageChart from '@/components/analytics/SceneCoverageChart'
import KeywordGapPanel from '@/components/analytics/KeywordGapPanel'
import KeywordDistributionChart from '@/components/analytics/KeywordDistributionChart'

/** Stat cards on top, then a 2×2 grid: heat map, scene coverage, keyword gaps, keyword distribution */
export default function AnalyticsDashboard({ analytics }: { analytics: ProductionAnalytics }) {
    return (
        <Box>
            <StatCards summary={analytics.summary} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                <Heatmap points={analytics.locationPoints} />
                <SceneCoverageChart coverage={analytics.sceneCoverage} />
                <KeywordGapPanel gaps={analytics.keywordGaps} />
                <KeywordDistributionChart distribution={analytics.keywordDistribution} />
            </Box>
        </Box>
    )
}
