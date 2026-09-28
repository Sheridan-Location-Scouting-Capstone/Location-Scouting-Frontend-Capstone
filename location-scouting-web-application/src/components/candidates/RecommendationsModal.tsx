'use client'

import { useState, useTransition } from 'react'
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AddIcon from '@mui/icons-material/Add'
import { addCandidateAction, getRecommendationsAction } from '@/actions/candidateActions'
import { isActionFailure } from '@/lib/actionResult'
import { matchStrength, toPercent } from '@/lib/format'

type ScoredLocation = {
    locationId: string
    locationName: string
    score: number
}

type RecommendationsModalProps = {
    open: boolean
    onCloseAction: () => void
    sceneId: string
    projectId: string
    candidatedLocationIds: string[]
}

/** Top-scoring locations from the user's library for this scene, each addable as a candidate */
export default function RecommendationsModal({ open, onCloseAction, sceneId, projectId, candidatedLocationIds }: RecommendationsModalProps) {
    const [recommendations, setRecommendations] = useState<ScoredLocation[]>([])
    const [loading, setLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [addError, setAddError] = useState<string | null>(null)
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
    const [isPending, startTransition] = useTransition()

    const fetchRecommendations = async () => {
        setLoading(true)
        setLoadError(null)
        const result = await getRecommendationsAction(sceneId)
        if (result.success) {
            setRecommendations(result.data)
        } else {
            setRecommendations([])
            setLoadError(result.error)
        }
        setLoading(false)
    }

    const handleOpen = () => {
        setAddedIds(new Set())
        setAddError(null)
        fetchRecommendations()
    }

    const handleAdd = (locationId: string) => {
        setAddError(null)
        startTransition(async () => {
            const result = await addCandidateAction(sceneId, locationId, projectId, [])
            if (isActionFailure(result)) {
                setAddError(result.error)
                return
            }
            setAddedIds((previous) => new Set(previous).add(locationId))
        })
    }

    return (
        <Dialog open={open} onClose={onCloseAction} maxWidth="sm" fullWidth slotProps={{ transition: { onEnter: handleOpen } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" />
                Recommended Locations
            </DialogTitle>

            <DialogContent>
                {addError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {addError}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress aria-label="Loading recommendations" />
                    </Box>
                ) : loadError ? (
                    <Alert severity="error">Couldn&apos;t load recommendations: {loadError}</Alert>
                ) : recommendations.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No recommendations found. Try adding more keywords to this scene or more locations to your library.
                    </Typography>
                ) : (
                    <Box component="ul" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, p: 0, listStyle: 'none' }}>
                        {recommendations.map((recommendation) => {
                            const alreadyAdded = candidatedLocationIds.includes(recommendation.locationId) || addedIds.has(recommendation.locationId)
                            const percent = toPercent(recommendation.score)

                            return (
                                <Box
                                    component="li"
                                    key={recommendation.locationId}
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
                                            {recommendation.locationName}
                                        </Typography>
                                        <Chip label={`${percent}% match`} size="small" color={matchStrength(percent)} variant="outlined" sx={{ mt: 0.5 }} />
                                    </Box>

                                    {alreadyAdded ? (
                                        <Chip label="Already added" size="small" variant="outlined" />
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => handleAdd(recommendation.locationId)}
                                            disabled={isPending}
                                            aria-label={`Add ${recommendation.locationName}`}
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
