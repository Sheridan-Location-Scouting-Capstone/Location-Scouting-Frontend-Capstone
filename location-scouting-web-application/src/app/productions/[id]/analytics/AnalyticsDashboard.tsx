'use client'

import {
    AnalyticsSummary,
    LocationPoint,
    KeywordGap,
    KeywordFrequency,
    AnalyticsDashboardProps,
} from "@/app/productions/[id]/analytics/analytics.types";
import {Box} from "@mui/material";

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
            <StatCards summary={summary}>
                
            </StatCards>
        </Box>
    )
}