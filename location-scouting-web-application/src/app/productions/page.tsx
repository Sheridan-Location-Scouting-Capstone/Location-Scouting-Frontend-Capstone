import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import Link from 'next/link'
import { getProjectsAction } from '@/app/actions/productionActions'
import ProductionGrid from '@/app/components/ProductionGrid'

export default async function ProductionsPage() {
  const projects = await getProjectsAction()

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Productions</Typography>
        <Link href="/productions/new" style={{ textDecoration: 'none' }}>
          <Button variant="contained" startIcon={<AddIcon />} size="large">
            Create New Production
          </Button>
        </Link>
      </Box>

      <ProductionGrid projects={projects} />
    </Box>
  )
}
