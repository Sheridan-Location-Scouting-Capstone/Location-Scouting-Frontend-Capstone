'use client'

import {
    AnalyticsSummary,
    LocationPoint,
    KeywordGap,
    KeywordFrequency,
    AnalyticsDashboardProps,
} from "@/app/(protected)/productions/[id]/analytics/analytics.types";
import {Box} from "@mui/material";
import StatCards from "@/app/(protected)/productions/[id]/analytics/StatCards";
import { Heatmap } from "@/components/Heatmap";
import SceneCoverageChart from "@/app/(protected)/productions/[id]/analytics/SceneCoverageChart";
import KeywordGapPanel from "@/app/(protected)/productions/[id]/analytics/KeywordGapPanel";
import KeywordDistributionChart from "@/app/(protected)/productions/[id]/analytics/KeywordDistributionChart";

export default function AnalyticsDashboard({
    summary,
    locationPoints,
    sceneCoverage,
    keywordGaps,
    keywordDistribution
} : AnalyticsDashboardProps ){
    return (
        <Box>
            {/* Summary stat cards */}
            <StatCards summary={summary} />

            <Box
                sx={{
                    display:'grid',
                    gridTemplateColumns: { xs : '1fr', md : 'repeat(2, 1fr)' },
                    gap: 2
                }}
            >

                {/* Top left: Heat Map */ }
                <Box>
                    <Heatmap points={locationPoints}>

                    </Heatmap>
                </Box>

                {/* Top Right: Scene-to-location coverage */}
                <SceneCoverageChart coverage={sceneCoverage}/>

                {/* Bottom Left: Keyword gaps */}
                <KeywordGapPanel gaps={keywordGaps}/>

                {/* Bottom right: Keyword distribution */}
                <KeywordDistributionChart distribution={keywordDistribution} />
            </Box>
        </Box>
    )
}