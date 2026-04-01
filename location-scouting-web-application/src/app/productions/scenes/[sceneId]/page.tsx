import { notFound } from 'next/navigation'
import { Box, Typography, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import Link from 'next/link'
import { prisma } from '@/app/lib/prisma'
import { getSceneById } from '@/app/services/sceneService'
// import { getCandidatesForScene } from '@/app/services/candidateService'
// import SceneDetailCard from '@/app/components/SceneDetailCard'
// import CandidateTable from '@/app/components/CandidateTable'

export default async function ViewScenePage({
    params,
}: {
    params: Promise<{ id: string; sceneId: string }>
}) {
    const { id: projectId, sceneId } = await params

    // Fetch project for breadcrumb
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) notFound()

    // Fetch scene
    const sceneResult = await getSceneById(sceneId)
    if (!sceneResult.success) notFound()
    const scene = sceneResult.data

    // Fetch candidates with their locations and photos
    const candidatesResult = await getCandidatesForScene(sceneId)
    const candidates = candidatesResult.data

    // Build slug-line display: "INT. KITCHEN - DAY"
    const slugParts = []
    if (scene.intExt) slugParts.push(scene.intExt.replace('_', '/'))
    slugParts.push(scene.sceneLocation.toUpperCase())
    if (scene.sceneTimeOfDay) slugParts.push(scene.sceneTimeOfDay.toUpperCase())
    const slugLine = slugParts.join('. ').replace('. ', '. ') + (scene.sceneTimeOfDay ? '' : '')
    // Format: "INT. KITCHEN - DAY"
    const formattedSlug = scene.intExt
        ? `${scene.intExt.replace('_', '/')}. ${scene.sceneLocation.toUpperCase()}${scene.sceneTimeOfDay ? ' - ' + scene.sceneTimeOfDay.toUpperCase() : ''}`
        : scene.sceneLocation.toUpperCase()

    return (
        <Box>
            {/* Breadcrumb + Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Link href={`/productions/${projectId}`} style={{ textDecoration: 'none' }}>
                        <Button startIcon={<ArrowBackIcon />} variant="outlined" size="small">
                            Back
                        </Button>
                    </Link>
                    <Typography variant="body2" color="text.secondary">
                        {project.name}
                        <Box component="span" sx={{ mx: 1 }}>/</Box>
                        <Box component="span" sx={{ color: 'text.secondary' }}>Scenes</Box>
                        <Box component="span" sx={{ mx: 1 }}>/</Box>
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Scene {scene.sceneNumber}
                        </Box>
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Link
                        href={`/productions/${projectId}/scenes/${sceneId}/edit`}
                        style={{ textDecoration: 'none' }}
                    >
                        <Button variant="contained" color="secondary" startIcon={<EditIcon />}>
                            Edit Scene
                        </Button>
                    </Link>
                    {/* TODO: Wire to location picker dialog or redirect to location search with "add as candidate" mode */}
                    <Button variant="contained" startIcon={<AddIcon />}>
                        Add Candidate
                    </Button>
                </Box>
            </Box>

            {/* Page title */}
            <Typography variant="h4" sx={{ mb: 2 }}>
                Scene {scene.sceneNumber} — {formattedSlug}
            </Typography>

            {/* Scene summary card */}
            <SceneDetailCard scene={scene} />

            {/* Candidates section */}
            <CandidateTable
                candidates={candidates}
                sceneId={sceneId}
                projectId={projectId}
            />
        </Box>
    )
}
