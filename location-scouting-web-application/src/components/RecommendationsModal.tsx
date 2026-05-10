'use client'

import { useState, useTransition } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Chip,
    CircularProgress,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AddIcon from '@mui/icons-material/Add'
import { getRecommendationsAction } from '@/actions/candidateActions'
import { addCandidateAction } from '@/actions/candidateActions'

type ScoredLocation = {
    locationId: string
    locationName: string
    score: number
}

export default function RecommendationsModal({
                                                 open,
                                                 onCloseAction,
                                                 sceneId,
                                                 projectId,
                                                 candidatedLocationIds,
                                             }: {
    open: boolean
    onCloseAction: () => void
    sceneId: string
    projectId: string
    candidatedLocationIds: string[]
}) {
    const [recommendations, setRecommendations] = useState<ScoredLocation[]>([])
    const [loading, setLoading] = useState(false)
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
    const [isPending, startTransition] = useTransition()

    const fetchRecommendations = async () => {
        setLoading(true)
        const result = await getRecommendationsAction(sceneId)
        if (result.success) {
            setRecommendations(result.data)
        }
        setLoading(false)
    }

    const handleOpen = () => {
        setAddedIds(new Set())
        fetchRecommendations()
    }

    const handleAdd = (locationId: string) => {
        startTransition(async () => {
            await addCandidateAction(sceneId, locationId, projectId, [])
            setAddedIds(prev => new Set(prev).add(locationId))
        })
    }

    return (
        <Dialog
            open={open}
            onClose={onCloseAction}
            maxWidth="sm"
            fullWidth
            TransitionProps={{ onEnter: handleOpen }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" />
                Recommended Locations
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : recommendations.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No recommendations found. Try adding more keywords to this scene or more locations to your library.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {recommendations.map((rec) => {
                            const alreadyCandidated = candidatedLocationIds.includes(rec.locationId)
                            const justAdded = addedIds.has(rec.locationId)
                            const pct = Math.round(rec.score * 100)

                            return (
                                <Box
                                    key={rec.locationId}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        p: 2,
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                    }}
                                >
                                    <Box>
                                        <Typography variant="body1" fontWeight={600}>
                                            {rec.locationName}
                                        </Typography>
                                        <Chip
                                            label={`${pct}% match`}
                                            size="small"
                                            color={pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'default'}
                                            variant="outlined"
                                            sx={{ mt: 0.5 }}
                                        />
                                    </Box>

                                    {alreadyCandidated || justAdded ? (
                                        <Chip label="Already added" size="small" variant="outlined" />
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => handleAdd(rec.locationId)}
                                            disabled={isPending}
                                        >
                                            Add
                                        </Button>
                                    )}
                                </Box>
                            )
                        })}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onCloseAction}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}