'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import { createSceneAction } from '@/app/actions/productionActions'

export default function NewScenePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.set('projectId', projectId)
    try {
      await createSceneAction(formData)
    } catch {
      // redirect happens in server action
    }
    setSubmitting(false)
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Add New Scene
      </Typography>

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <MovieIcon color="primary" />
              <Typography variant="h6">Scene Details</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
              <Grid container spacing={2}>
                <Grid size={4}>
                  <TextField
                    name="sceneNumber"
                    label="Scene Number"
                    type="number"
                    required
                    fullWidth
                  />
                </Grid>
                <Grid size={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Int / Ext</InputLabel>
                    <Select name="intExt" label="Int / Ext" defaultValue="">
                      <MenuItem value="INT">INT</MenuItem>
                      <MenuItem value="EXT">EXT</MenuItem>
                      <MenuItem value="INT_EXT">INT/EXT</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={4}>
                  <TextField
                    name="sceneTimeOfDay"
                    label="Time of Day"
                    required
                    fullWidth
                    placeholder="Day, Night, Dawn..."
                  />
                </Grid>
              </Grid>

              <TextField
                name="sceneLocation"
                label="Scene Location"
                required
                fullWidth
                placeholder="e.g. KITCHEN, PARK BENCH, OFFICE"
              />

              <TextField
                name="scriptSection"
                label="Script Content"
                required
                fullWidth
                multiline
                rows={6}
                placeholder="Paste the scene content from the screenplay..."
              />
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => router.push(`/productions/${projectId}`)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creating...' : 'Add Scene'}
          </Button>
        </Box>
      </form>
    </Box>
  )
}
