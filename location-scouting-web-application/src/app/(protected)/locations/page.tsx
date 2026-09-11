import { Suspense } from 'react'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import Link from 'next/link'
import LocationTable from '@/components/LocationTable'
import { getLocationsAction } from '@/actions/locationActions'

export default async function LocationsPage({
                                              searchParams,
                                            }: {
  searchParams: Promise<{ q?: string; keywords?: string }>
}) {
  const params = await searchParams
  const query = params.q || undefined
  const keywords = params.keywords ? params.keywords.split(',') : undefined

  const locations = await getLocationsAction(query, keywords)

  return (
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Locations</Typography>
            <Button
                href="/locations/new"
                variant="contained"
                startIcon={<AddIcon />}
                size="large"
                data-testid="add-new-location"
            >
                Add New Location
            </Button>
        </Box>

        {/* Table */}
        <Suspense fallback={<CircularProgress />}>
          <LocationTable locations={locations} />
        </Suspense>
      </Box>
  )
}
