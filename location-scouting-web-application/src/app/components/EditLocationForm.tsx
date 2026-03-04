'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
} from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import { updateLocationAction } from '@/app/actions/locationActions'

type LocationData = {
  id: string
  name: string
  address: string
  city: string
  province: string
  postalCode: string
  country: string
  notes: string | null
  keywords: string[]
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
}

export default function EditLocationForm({ location }: { location: LocationData }) {
  const router = useRouter()
  const [keywords, setKeywords] = useState<string[]>(location.keywords)
  const [keywordInput, setKeywordInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addKeyword = () => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 50) {
      setKeywords([...keywords, trimmed])
      setKeywordInput('')
    }
  }

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('keywords', keywords.join(','))

    try {
      await updateLocationAction(location.id, formData)
    } catch {
      // redirect happens in server action
    }
    setSubmitting(false)
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Edit Location
      </Typography>

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <ImageIcon color="primary" />
              <Typography variant="h6">Location Details</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
              <TextField
                name="name"
                label="Location Name"
                required
                fullWidth
                defaultValue={location.name}
              />

              <TextField
                name="notes"
                label="Description"
                multiline
                rows={3}
                fullWidth
                defaultValue={location.notes || ''}
              />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField name="address" label="Street Address" required fullWidth defaultValue={location.address} />
                </Grid>
                <Grid item xs={6}>
                  <TextField name="city" label="City" required fullWidth defaultValue={location.city} />
                </Grid>
                <Grid item xs={3}>
                  <TextField name="province" label="Province" required fullWidth defaultValue={location.province} />
                </Grid>
                <Grid item xs={3}>
                  <TextField name="postalCode" label="Postal Code" required fullWidth defaultValue={location.postalCode} />
                </Grid>
                <Grid item xs={6}>
                  <TextField name="country" label="Country" fullWidth defaultValue={location.country} />
                </Grid>
              </Grid>

              {/* Keywords / Tags */}
              <Box>
                <TextField
                  label="Tags"
                  fullWidth
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                  helperText="Press Enter to add a tag"
                />
                {keywords.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {keywords.map((kw) => (
                      <Chip
                        key={kw}
                        label={kw}
                        size="small"
                        onDelete={() => removeKeyword(kw)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Contact Info */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                Contact Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField name="contactName" label="Contact Name" fullWidth defaultValue={location.contactName || ''} />
                </Grid>
                <Grid item xs={6}>
                  <TextField name="contactPhone" label="Phone" fullWidth defaultValue={location.contactPhone || ''} />
                </Grid>
                <Grid item xs={6}>
                  <TextField name="contactEmail" label="Email" type="email" fullWidth defaultValue={location.contactEmail || ''} />
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => router.push(`/locations/${location.id}`)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </form>
    </Box>
  )
}
