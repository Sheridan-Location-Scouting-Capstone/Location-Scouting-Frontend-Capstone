import { notFound } from 'next/navigation'
import { Box, Typography, Button, Card, CardContent, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import ShareIcon from '@mui/icons-material/Share'
import Link from 'next/link'
import { getLocationAction } from '@/app/actions/locationActions'
import LocationPhotoGallery from '@/app/components/LocationPhotoGallery'
import LocationStatusActions from '@/app/components/LocationStatusActions'

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const location = await getLocationAction(id)

  if (!location) {
    notFound()
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" sx={{ mb: 1 }}>
        {location.name}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Link href="/location" style={{ textDecoration: 'none' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size="small"
          >
            Back
          </Button>
        </Link>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <LocationStatusActions locationId={location.id} currentStatus={location.status} />
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ShareIcon />}
          >
            Share
          </Button>
          <Link href={`/locations/${location.id}/edit`} style={{ textDecoration: 'none' }}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
          >
            Edit Location
          </Button>
          </Link>
        </Box>
      </Box>

      {/* Info card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
              gap: 2,
            }}
          >
            {/* Description */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Description
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {location.notes || 'No description added.'}
              </Typography>
            </Box>

            {/* Tags */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {location.keywords.length > 0 ? (
                  location.keywords.map((kw) => (
                    <Chip key={kw} label={kw} size="small" variant="outlined" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No tags
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Address */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Address
              </Typography>
              <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                {location.address}, {location.city}, {location.province}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {location.postalCode}, {location.country}
              </Typography>
            </Box>

            {/* Contact */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Contact
              </Typography>
              {location.contactName ? (
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="body2">{location.contactName}</Typography>
                  {location.contactPhone && (
                    <Typography variant="body2" color="text.secondary">
                      {location.contactPhone}
                    </Typography>
                  )}
                  {location.contactEmail && (
                    <Typography variant="body2" color="primary.main">
                      {location.contactEmail}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  No contact info
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <LocationPhotoGallery
        photos={location.photos}
        locationId={location.id}
      />
    </Box>
  )
}
