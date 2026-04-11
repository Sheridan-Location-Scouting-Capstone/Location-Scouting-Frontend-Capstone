'use client'

import { Box, Card, Typography } from '@mui/material'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";
import { useTheme } from '@mui/material/styles'
import type { SceneCoverage } from "@/app/productions/[id]/analytics/analytics.types"

export default function SceneCoverageChart({ coverage }: { coverage: SceneCoverage }) {
    const theme = useTheme()
    const { selected, candidateOnly, noCandidates } = coverage
    const total = selected + candidateOnly + noCandidates

    const data = [
        {
            name: 'Scenes',
            selected,
            candidateOnly,
            noCandidates,
        },
    ]

    const segments = [
        { key: 'selected', label: 'Selected (locked)', color: theme.palette.success.main },
        { key: 'candidateOnly', label: 'Has candidates', color: theme.palette.info.light },
        { key: 'noCandidates', label: 'No candidates', color: theme.palette.action.disabled },
    ]

    return (
        <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>
                Scene-to-location coverage
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                How many scenes have candidates assigned
            </Typography>

            {/* Custom legend */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                {segments.map((seg) => {
                    const value = coverage[seg.key as keyof SceneCoverage]
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0
                    return (
                        <Box key={seg.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box
                                sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 0.5,
                                    bgcolor: seg.color,
                                }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {seg.label} {pct}%
                            </Typography>
                        </Box>
                    )
                })}
            </Box>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={80}>
                <BarChart data={data} layout="vertical" barSize={28}>
                    <XAxis type="number" domain={[0, total]} hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                        formatter={(value: number, name: string) => {
                            const label = segments.find((s) => s.key === name)?.label ?? name
                            return [`${value} scenes`, label]
                        }}
                    />
                    {segments.map((seg) => (
                        <Bar key={seg.key} dataKey={seg.key} stackId="coverage" fill={seg.color} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Card>
    )
}