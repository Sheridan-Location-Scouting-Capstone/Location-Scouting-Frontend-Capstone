import { notFound } from 'next/navigation'
import { Box, Typography, Button } from '@mui/material'
import {getProject, getScenesAction} from '@/app/actions/productionActions'
import { getLocationsByProject } from '@/app/services/productionService'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import Link from "next/link";
import SceneTable from '@/app/components/SceneTable'
import AnalyticsIcon from '@mui/icons-material/Analytics'

export default async function ProductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const result = await getProject(id)
  if (!result.success) notFound()

  const project = result.data

  const scenes = await getScenesAction(id)

  const locations = await getLocationsByProject({projectId: id});

  const projectId = project.id;

  return (
  <Box>
    <Typography variant="h4" sx={{ mb: 1 }}>
      {project.name} - Scenes
    </Typography>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Link href="/productions" style={{ textDecoration: 'none' }}>
            <Button startIcon={<ArrowBackIcon />} variant="outlined" size="small">
            Back
            </Button>
        </Link>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Link href={`/productions/${projectId}/edit`} style={{ textDecoration: 'none' }}>
                <Button variant="contained" color="secondary">Manage Production</Button>
            </Link>
            <Link href={`/productions/${projectId}/analytics`} style={{ textDecoration: 'none' }}>
                <Button variant="outlined" startIcon={<AnalyticsIcon />}>Analytics</Button>
            </Link>
            <Link href={`/productions/${projectId}/scenes/new`} style={{ textDecoration: 'none' }}>
                <Button variant="contained" startIcon={<AddIcon />}>Add New Scene</Button>
            </Link>
        </Box>
    </Box>

    <SceneTable scenes={scenes} projectId={projectId} />
  </Box>
)
}
