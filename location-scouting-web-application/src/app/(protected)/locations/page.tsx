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
            <Link href="/locations/new" style={{ textDecoration: 'none' }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    size="large"
                 >
                    Add New Location
                </Button>
            </Link>
        </Box>

        {/* Table */}
        <Suspense fallback={<CircularProgress />}>
          <LocationTable locations={locations} />
        </Suspense>
      </Box>
  )
}
