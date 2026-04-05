import { notFound } from 'next/navigation'
import { Box, Typography, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import Link from 'next/link'
import { prisma } from '@/app/lib/prisma'
import {getProject, getScenesAction} from '@/app/actions/productionActions'
import SceneTable from '@/app/components/SceneTable'

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

  return (
    <Box>
      {/* Title */}
      <Typography variant="h4" sx={{ mb: 1 }}>
        {project.name} - Scenes
      </Typography>

      {/* Actions bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Link href="/productions" style={{ textDecoration: 'none' }}>
            <Button startIcon={<ArrowBackIcon />} variant="outlined" size="small">
              Back
            </Button>
          </Link>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Link href={`/productions/${id}/edit`} style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="secondary">
              Manage Production
            </Button>
          </Link>
          <Link href={`/productions/${id}/scenes/new`} style={{ textDecoration: 'none' }}>
            <Button variant="contained" startIcon={<AddIcon />}>
              Add New Scene
            </Button>
          </Link>
        </Box>
      </Box>

      {/* Scenes table */}
      <SceneTable scenes={scenes} projectId={id} />
    </Box>
  )
}
