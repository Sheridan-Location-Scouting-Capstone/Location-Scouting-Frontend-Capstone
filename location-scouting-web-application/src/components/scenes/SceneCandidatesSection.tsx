'use client'

import { useState } from 'react'
import { Box, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import LinkButton from '@/components/common/LinkButton'
import CandidateTable, { CandidateRow } from '@/components/candidates/CandidateTable'
import AddCandidateModal, { LocationForPicker } from '@/components/candidates/AddCandidateModal'
import RecommendationsModal from '@/components/candidates/RecommendationsModal'

type SceneCandidatesSectionProps = {
    rows: CandidateRow[]
    /** Locations that can be added as candidates */
    locations: LocationForPicker[]
    candidatedLocationIds: string[]
    sceneId: string
    projectId: string
}

/** The interactive half of the scene page: scene actions, the candidates table, and the add/recommend dialogs */
export default function SceneCandidatesSection({ rows, locations, candidatedLocationIds, sceneId, projectId }: SceneCandidatesSectionProps) {
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [recommendationsOpen, setRecommendationsOpen] = useState(false)

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 2 }}>
                <LinkButton href={`/productions/${projectId}/scenes/${sceneId}/edit`} variant="contained" color="secondary" startIcon={<EditIcon />}>
                    Edit Scene
                </LinkButton>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddModalOpen(true)}>
                    Add Candidate
                </Button>
            </Box>

            <CandidateTable
                candidates={rows}
                sceneId={sceneId}
                projectId={projectId}
                onAddCandidateAction={() => setAddModalOpen(true)}
                onGetRecommendationsAction={() => setRecommendationsOpen(true)}
            />

            <AddCandidateModal
                open={addModalOpen}
                onCloseAction={() => setAddModalOpen(false)}
                locations={locations}
                candidatedLocationIds={candidatedLocationIds}
                sceneId={sceneId}
                projectId={projectId}
            />

            <RecommendationsModal
                open={recommendationsOpen}
                onCloseAction={() => setRecommendationsOpen(false)}
                sceneId={sceneId}
                projectId={projectId}
                candidatedLocationIds={candidatedLocationIds}
            />
        </>
    )
}
