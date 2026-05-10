import { Box, Card, Typography, Chip } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import type { KeywordGap } from "@/app/(protected)/productions/[id]/analytics/analytics.types"

export default function KeywordGapPanel({ gaps }: { gaps: KeywordGap[] }) {
    return (
        <Card variant="outlined" sx={{ p: 2.5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={500}>
                    Keyword gaps
                </Typography>
                <Chip
                    label={gaps.length > 0 ? `${gaps.length} unmatched` : 'all matched'}
                    size="small"
                    color={gaps.length > 0 ? 'error' : 'success'}
                    variant="outlined"
                />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Scene keywords with no matching location in your library
            </Typography>

            {/* All-clear state */}
            {gaps.length === 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 6,
                        gap: 1,
                    }}
                >
                    <CheckCircleOutlineIcon sx={{ fontSize: 32, color: 'success.main' }} />
                    <Typography variant="body2" fontWeight={500} color="success.dark">
                        All keywords covered
                    </Typography>
                    <Typography variant="caption" color="text.disabled" textAlign="center">
                        Every keyword in your scenes has at least one matching location
                    </Typography>
                </Box>
            )}

            {/* Gap list */}
            {gaps.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {gaps.map((gap) => (
                        <Box
                            key={gap.keyword}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 1.5,
                                py: 1,
                                bgcolor: 'rgba(211, 47, 47, 0.08)',
                                border: '1px solid',
                                borderColor: 'rgba(211, 47, 47, 0.2)',
                                borderRadius: 1,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CancelOutlinedIcon sx={{ fontSize: 16, color: 'error.dark' }} />
                                <Typography variant="body2" fontWeight={500} color="error.dark">
                                    {gap.keyword}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="error.dark">
                                {gap.sceneCount} {gap.sceneCount === 1 ? 'scene' : 'scenes'}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Card>
    )
}