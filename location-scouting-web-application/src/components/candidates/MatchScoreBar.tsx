import { Box, Typography } from '@mui/material'
import { matchStrength, toPercent } from '@/lib/format'

const BAR_COLORS = { success: 'success.main', warning: 'warning.main', default: 'text.disabled' } as const

/** A small bar + percentage for a candidate's match score. Candidates without a score were added manually. */
export default function MatchScoreBar({ score }: { score: number | null }) {
    if (score == null) {
        return (
            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                Manual
            </Typography>
        )
    }

    const percent = toPercent(score)

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
                role="meter"
                aria-label="Match score"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                sx={{ width: 48, height: 6, borderRadius: 3, bgcolor: 'grey.200', overflow: 'hidden' }}
            >
                <Box
                    sx={{
                        width: `${percent}%`,
                        height: '100%',
                        borderRadius: 3,
                        bgcolor: BAR_COLORS[matchStrength(percent)],
                        transition: 'width 0.3s ease',
                    }}
                />
            </Box>
            <Typography variant="body2" fontWeight={500} fontSize="0.8rem">
                {percent}%
            </Typography>
        </Box>
    )
}
