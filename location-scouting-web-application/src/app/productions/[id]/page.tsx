import { notFound } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { prisma } from '@/app/lib/prisma'
import {getProject, getScenesAction} from '@/app/actions/productionActions'
import { getLocationsByProject } from '@/app/services/productionService'
import { ProductionsBody } from '@/app/components/HeatmapToggle'

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

  return (
  <Box>
    <Typography variant="h4" sx={{ mb: 1 }}>
      {project.name} - Scenes
    </Typography>
    <ProductionsBody 
      points={locations.data}
      scenes={scenes}
      projectId={id}
    />
  </Box>
)
}
