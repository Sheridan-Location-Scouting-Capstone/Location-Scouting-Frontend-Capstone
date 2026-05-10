'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Grid,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CloseIcon from '@mui/icons-material/Close'
import ImageIcon from '@mui/icons-material/Image'
import { createLocationAction } from '@/actions/locationActions'

export default function NewLocationPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [photoNames, setPhotoNames] = useState<string[]>([])
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotoFiles((prev) => [...prev, ...files])
    setPhotoNames((prev) => [...prev, ...files.map(() => '')])

    // Generate previews
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotoPreviews((prev) => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
    setPhotoNames((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Add keywords as comma-separated string
    formData.set('keywords', keywords.join(','))

    // Remove the file input and re-add our managed files
    formData.delete('photos')
    photoFiles.forEach((file, i) => {
      formData.append('photos', file)
      formData.append('photoNames', photoNames[i] || '')
    })

    try {
      await createLocationAction(formData)
    } catch {
      // redirect happens in server action
    }
    setSubmitting(false)
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Add New Location
      </Typography>

      <form onSubmit={handleSubmit}>
        {/* Location Details Card */}
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
              />

              <TextField
                name="notes"
                label="Add a description"
                multiline
                rows={3}
                fullWidth
              />

              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField name="address" label="Street Address" required fullWidth />
                </Grid>
                <Grid size={6}>
                  <TextField name="city" label="City" required fullWidth />
                </Grid>
                <Grid size={3}>
                  <TextField name="province" label="Province" required fullWidth />
                </Grid>
                <Grid size={3}>
                  <TextField name="postalCode" label="Postal Code" required fullWidth />
                </Grid>
                <Grid size={6}>
                  <TextField name="country" label="Country" defaultValue="Canada" fullWidth />
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
                <Grid size={12}>
                  <TextField name="contactName" label="Contact Name" fullWidth />
                </Grid>
                <Grid size={6}>
                  <TextField name="contactPhone" label="Phone" fullWidth />
                </Grid>
                <Grid size={6}>
                  <TextField name="contactEmail" label="Email" type="email" fullWidth />
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        {/* Upload Photos Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CloudUploadIcon color="primary" />
              <Typography variant="h6">Upload Photos</Typography>
            </Box>

            {/* Photo previews */}
            {photoPreviews.length > 0 && (
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {photoPreviews.map((preview, index) => (
                    <Grid size={{ xs: 3, sm: 2 }} key={index}>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={preview}
                        sx={{
                          width: '100%',
                          aspectRatio: '4/3',
                          objectFit: 'cover',
                          borderRadius: 1,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removePhoto(index)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                          width: 24,
                          height: 24,
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                    <TextField
                      size="small"
                      placeholder={photoFiles[index]?.name || 'Photo name'}
                      value={photoNames[index] || ''}
                      onChange={(e) => {
                        setPhotoNames((prev) => {
                          const updated = [...prev]
                          updated[index] = e.target.value
                          return updated
                        })
                      }}
                      fullWidth
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Upload dropzone area */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed #D0D0D0',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: '#FAFAFA',
                transition: 'border-color 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <Button variant="outlined" component="span">
                Upload Photos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                name="photos"
                multiple
                accept="image/*"
                hidden
                onChange={handlePhotoSelect}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Submit buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => router.push('/locations')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Add Location'}
          </Button>
        </Box>
      </form>
    </Box>
  )
}
