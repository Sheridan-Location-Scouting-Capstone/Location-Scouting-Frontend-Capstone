// components/ViewSceneClientWrapper.tsx
'use client'

import { useState } from 'react'
import { Box, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AddCandidateModal from '@/components/AddCandidateModal'
import CandidateTable from '@/components/CandidateTable'
import { CandidateRow } from '@/components/CandidateTable'
import Link from "next/link";
import EditIcon from "@mui/icons-material/Edit";
import RecommendationsModal from "@/components/RecommendationsModal";

export default function ViewSceneClientWrapper({
   rows,
   locations,
   candidatedLocationIds,
   sceneId,
   projectId,
}: {
    rows: CandidateRow[]
    locations: any[]
    candidatedLocationIds: string[]
    sceneId: string
    projectId: string
}) {
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [recsModalOpen, setRecsModalOpen] = useState(false)

    return (
        <>
            {/* Action buttons — aligned right */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 2 }}>
                <Link
                    href={`/productions/${projectId}/scenes/${sceneId}/edit`}
                    style={{ textDecoration: 'none' }}
                >
                    <Button variant="contained" color="secondary" startIcon={<EditIcon />}>
                        Edit Scene
                    </Button>
                </Link>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddModalOpen(true)}
                >
                    Add Candidate
                </Button>
            </Box>

            {/* Candidates table */}
            <CandidateTable
                candidates={rows}
                sceneId={sceneId}
                projectId={projectId}
                onAddCandidateAction={() => setAddModalOpen(true)}
                onGetRecommendations={() => setRecsModalOpen(true)}
            />

            {/* Add Candidate modal */}
            <AddCandidateModal
                open={addModalOpen}
                onCloseAction={() => setAddModalOpen(false)}
                locations={locations}
                candidatedLocationIds={candidatedLocationIds}
                sceneId={sceneId}
                projectId={projectId}
            />

            {/* Get Recommendations Modal */}
            <RecommendationsModal
                open={recsModalOpen}
                onCloseAction={() => setRecsModalOpen(false)}
                sceneId={sceneId}
                projectId={projectId}
                candidatedLocationIds={candidatedLocationIds}
            />
        </>
    )
}