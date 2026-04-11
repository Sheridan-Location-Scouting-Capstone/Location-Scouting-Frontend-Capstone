'use client'

import './analytics.types'
import {AnalyticsSummary} from "@/app/productions/[id]/analytics/analytics.types";
import {Card, CardContent, Typography} from "@mui/material";

export default function StatsSummaryCards({ summaryStats} : { summaryStats: AnalyticsSummary }) {
    return (

    <Card sx={{ minWidth : 275 }}>
        <CardContent>
            <Typography sx={{ color: 'textSecondary', mb: 1, fontSize: 18 }}>

            </Typography>
        </CardContent>
    </Card>
    )

}