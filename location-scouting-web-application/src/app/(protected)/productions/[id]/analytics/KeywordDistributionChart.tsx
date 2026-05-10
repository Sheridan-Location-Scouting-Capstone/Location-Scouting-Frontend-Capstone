'use client'

import { Card, Typography } from '@mui/material'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { useTheme } from '@mui/material/styles'
import type { KeywordFrequency } from '@/services/analytics.types'

export default function KeywordDistributionChart({
                                                     distribution,
                                                 }: {
    distribution: KeywordFrequency[]
}) {
    const theme = useTheme()

    // Recharts expects a flat data array
    const data = distribution.map((kf) => ({
        keyword: kf.keyword,
        scenes: kf.sceneCount,
    }))

    // Scale chart height to number of bars so it doesn't get cramped or too sparse
    const barHeight = 32
    const chartHeight = Math.max(data.length * barHeight + 40, 120)

    return (
        <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>
                Keyword distribution
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Most common keywords across scenes in this production
            </Typography>

            {data.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
                    No keywords found
                </Typography>
            ) : (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
                        <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                            allowDecimals={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="keyword"
                            tickLine={false}
                            axisLine={false}
                            width={90}
                            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        />
                        <Tooltip
                            formatter={(value: number) => [`${value} scenes`, 'Appears in']}
                            cursor={{ fill: theme.palette.action.hover }}
                        />
                        <Bar
                            dataKey="scenes"
                            fill={theme.palette.primary.main}
                            radius={[0, 3, 3, 0]}
                            barSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Card>
    )
}