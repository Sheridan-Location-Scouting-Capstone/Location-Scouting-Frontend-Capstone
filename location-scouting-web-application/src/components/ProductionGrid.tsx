'use client'

import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import StarBorderIcon from '@mui/icons-material/StarBorder'

type Project = {
  id: string
  name: string
  address: string
  city: string
  province: string
  createdAt: Date
  updatedAt: Date
}

export default function ProductionGrid({ projects }: { projects: Project[] }) {
  const router = useRouter()

  if (projects.length === 0) {
    return (
      <Card sx={{ p: 6, textAlign: 'center' }}>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          No productions yet. Create your first production to get started!
        </Typography>
      </Card>
    )
  }

  return (
    <Box>
      {/* Sort filter */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Sort by Date</InputLabel>
          <Select defaultValue="newest" label="Sort by Date">
            <MenuItem value="newest">Newest - Oldest</MenuItem>
            <MenuItem value="oldest">Oldest - Newest</MenuItem>
          </Select>
        </FormControl>
      </Card>

      {/* Card grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 3,
        }}
      >
        {projects.map((project) => (
          <Card key={project.id} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <CardActionArea onClick={() => router.push(`/productions/${project.id}`)}>
              {/* Header */}
              <CardContent sx={{ pb: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {project.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {project.city}, {project.province}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>

              {/* Placeholder image area */}
              <Box
                sx={{
                  mx: 2,
                  mt: 1.5,
                  height: 160,
                  borderRadius: 1.5,
                  bgcolor: '#E8E8E8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No thumbnail
                </Typography>
              </Box>

              {/* Footer */}
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Edited {formatTimeAgo(project.updatedAt)}
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} mins ago`
  if (hours < 24) return `${hours} hours ago`
  if (days < 30) return `${days} days ago`
  return new Date(date).toLocaleDateString()
}
