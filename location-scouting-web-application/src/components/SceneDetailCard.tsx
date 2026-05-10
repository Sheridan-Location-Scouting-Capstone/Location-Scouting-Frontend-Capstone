'use client'

import { useState } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    Collapse,
    IconButton,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import NotesIcon from '@mui/icons-material/Notes'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

type SceneData = {
    id: string
    sceneNumber: number
    intExt: string | null
    sceneLocation: string
    sceneTimeOfDay: string | null
    scriptSection: string
    keywords: string[]
    // notes field — not in schema yet, but included for future use
}

const TRUNCATE_LENGTH = 200

export default function SceneDetailCard({ scene }: { scene: SceneData }) {
    const [contentExpanded, setContentExpanded] = useState(false)

    const shouldTruncate = scene.scriptSection.length > TRUNCATE_LENGTH
    const displayContent = contentExpanded || !shouldTruncate
        ? scene.scriptSection
        : scene.scriptSection.slice(0, TRUNCATE_LENGTH).trimEnd() + '...'

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                {/* Row 1: Metadata strip */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1.5,
                        flexWrap: 'wrap',
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={700}>
                        Scene {scene.sceneNumber}
                    </Typography>

                    {scene.intExt && (
                        <Chip
                            label={scene.intExt.replace('_', '/')}
                            size="small"
                            variant="outlined"
                        />
                    )}

                    {scene.sceneTimeOfDay && (
                        <Chip
                            label={scene.sceneTimeOfDay}
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Box>

                {/* Row 2: Keywords */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 0.5 }}>
                        Keywords
                    </Typography>

                    {scene.keywords.length > 0 ? (
                        scene.keywords.map((kw) => (
                            <Chip
                                key={kw}
                                label={kw}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: '0.75rem' }}
                            />
                        ))
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                No keywords generated
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<AutoAwesomeIcon />}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                                Generate Keywords
                            </Button>
                        </Box>
                    )}
                </Box>

                {/* Row 3: Script content */}
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.82rem',
                        }}
                    >
                        {displayContent}
                    </Typography>

                    {shouldTruncate && (
                        <Button
                            size="small"
                            onClick={() => setContentExpanded(!contentExpanded)}
                            endIcon={contentExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ textTransform: 'none', mt: 0.5, fontSize: '0.78rem' }}
                        >
                            {contentExpanded ? 'Show less' : 'Show more'}
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    )
}
