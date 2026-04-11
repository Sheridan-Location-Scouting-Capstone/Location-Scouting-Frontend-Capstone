import { Box, Card, Typography } from '@mui/material'
import type { AnalyticsSummary } from '@/app/services/analytics.types'

export default function StatCards({ summary }: { summary: AnalyticsSummary }) {
    const {
        totalScenes,
        intCount,
        extCount,
        intExtCount,
        scenesWithCandidates,
        scenesWithSelected,
        uniqueKeywords,
        matchedKeywords,
        unmatchedKeywords,
    } = summary

    const coveragePercent =
        totalScenes > 0 ? Math.round((scenesWithCandidates / totalScenes) * 100) : 0
    const lockedPercent =
        totalScenes > 0 ? Math.round((scenesWithSelected / totalScenes) * 100) : 0

    const cards = [
        {
            label: 'Total scenes',
            value: totalScenes,
            sub: `${intCount} INT / ${extCount} EXT / ${intExtCount} INT/EXT`,
        },
        {
            label: 'Scenes with candidates',
            value: scenesWithCandidates,
            sub: `${coveragePercent}% coverage`,
            color: 'success.main',
        },
        {
            label: 'Scenes locked',
            value: scenesWithSelected,
            sub: `${lockedPercent}% of total scenes`,
            color: 'info.main',
        },
        {
            label: 'Unique keywords',
            value: uniqueKeywords,
            sub: `${matchedKeywords} matched, ${unmatchedKeywords} unmatched`,
        },
    ]

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 1.5,
                mb: 2,
            }}
        >
            {cards.map((card) => (
                <Card
                    key={card.label}
                    variant="outlined"
                    sx={{ p: 2, bgcolor: 'action.hover', border: 'none' }}
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                        {card.label}
                    </Typography>
                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 500, color: card.color ?? 'text.primary' }}
                    >
                        {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        {card.sub}
                    </Typography>
                </Card>
            ))}
        </Box>
    )
}