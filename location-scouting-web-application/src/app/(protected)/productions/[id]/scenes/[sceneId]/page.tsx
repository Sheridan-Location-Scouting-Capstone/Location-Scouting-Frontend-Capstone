import { notFound } from 'next/navigation'
import { Box, Typography, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'
import { getSceneById } from '@/services/sceneService'
import {getProject} from "@/actions/productionActions";
import {getCandidatesForScene} from "@/services/candidateService";
import SceneDetailCard from "@/components/SceneDetailCard";
import CandidateTable, {CandidateRow} from "@/components/CandidateTable";
import {getLocationsAction} from "@/actions/locationActions";
import ViewSceneClientWrapper from "@/components/ViewSceneClientWrapper";
import { scoreCandidates } from '@/services/recommendationService'


export default async function ViewScenePage({
    params,
}: {
    params: Promise<{ id: string; sceneId: string }>
}) {
    const { id: projectId, sceneId } = await params

    // Fetch project for breadcrumb
    const result = await getProject(projectId)
    if (!result.success) notFound()
    const project = result.data

    // Fetch scene
    const sceneResult = await getSceneById(sceneId)
    if (!sceneResult.success) notFound()
    const scene = sceneResult.data

    // Fetch candidates with their locations and photos
    const candidatesResult = await getCandidatesForScene(sceneId)
    if(!candidatesResult.success) notFound()
    const candidates = candidatesResult.data

    // Fetch locations to feed into the add candidate modal
    const locations = await getLocationsAction()
    const candidatedLocationIds = candidates.map(c => c.locationId)
    const scoresResult = await scoreCandidates(sceneId)

    const rows: CandidateRow[] = candidates.map(c => ({
        id: c.id,
        selected: c.selected,
        thumbnailUrl: c.photos[0]?.photo.url ?? null,
        matchScore: scoresResult.success ? scoresResult.data.get(c.id) ?? null : null,
        location: {
            id: c.location.id,
            name: c.location.name,
            address: c.location.address,
            city: c.location.city,
            province: c.location.province,
            keywords: c.location.keywords,
            latitude: c.location.latitude,
            longitude: c.location.longitude,
        }
    }))

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
                    <Link href={`/location-scouting-web-application/src/app/(protected)/productions/${projectId}`} style={{ textDecoration: 'none' }}>
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
            </Box>

            {/* Page title */}
            <Typography variant="h4" sx={{ mb: 2 }}>
                Scene {scene.sceneNumber} — {formattedSlug}
            </Typography>

            {/* Scene summary card */}
            <SceneDetailCard scene={scene} />

            {/* Client-managed: action buttons + candidates table + modal */}
            <ViewSceneClientWrapper
                rows={rows}
                locations={locations}
                candidatedLocationIds={candidatedLocationIds}
                sceneId={sceneId}
                projectId={projectId}
            />
        </Box>
    )
}
