'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  Card,
  TextField,
  InputAdornment,
  Autocomplete,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArchiveIcon from '@mui/icons-material/Archive'
import DeleteIcon from '@mui/icons-material/Delete'
import { updateLocationStatusAction } from '@/actions/locationActions'

export type LocationRow = {
  id: string
  name: string
  address: string
  city: string
  province: string
  keywords: string[]
  notes: string | null
  status: string
  createdAt: Date
  photos: { url: string }[]
}

export default function LocationTable({ locations }: { locations: LocationRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuLocationId, setMenuLocationId] = useState<string | null>(null)

  // Collect all unique keywords for the filter dropdown
  const allKeywords = useMemo(() => {
    const set = new Set<string>()
    locations.forEach((loc) => loc.keywords.forEach((k) => set.add(k)))
    return Array.from(set).sort()
  }, [locations])

  // Client-side filtering
  const filtered = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch =
        !search ||
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.address.toLowerCase().includes(search.toLowerCase()) ||
        loc.city.toLowerCase().includes(search.toLowerCase())

      const matchesKeywords =
        selectedKeywords.length === 0 ||
        selectedKeywords.some((kw) => loc.keywords.includes(kw))

      return matchesSearch && matchesKeywords
    })
  }, [locations, search, selectedKeywords])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, locationId: string) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuLocationId(locationId)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setMenuLocationId(null)
  }

  const handleStatusChange = async (status: 'ACTIVE' | 'ARCHIVED' | 'DELETED') => {
    if (menuLocationId) {
      await updateLocationStatusAction(menuLocationId, status)
    }
    handleMenuClose()
  }

  return (
    <Box>
      {/* Filters */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search locations..."
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Autocomplete
            multiple
            size="small"
            options={allKeywords}
            value={selectedKeywords}
            onChange={(_, val) => {
              setSelectedKeywords(val)
              setPage(0)
            }}
            renderInput={(params) => (
              <TextField {...params} label="Filter by Keywords" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                  key={option}
                  color="primary"
                  variant="outlined"
                />
              ))
            }
            sx={{ minWidth: 260 }}
          />
        </Box>
      </Card>

      {/* Results count */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {filtered.length} Result{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Thumbnail</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      {locations.length === 0
                        ? 'No locations yet. Add your first location to get started!'
                        : 'No locations match your search.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((loc) => (
                  <TableRow
                    key={loc.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/locations/${loc.id}`)}
                  >
                    {/* Thumbnail */}
                    <TableCell sx={{ width: 80 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 45,
                          borderRadius: 1,
                          overflow: 'hidden',
                          bgcolor: '#E0E0E0',
                        }}
                      >
                        {loc.photos?.[0]?.url ? (
                          <img
                            src={loc.photos[0].url}
                            alt={loc.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#999',
                              fontSize: '0.7rem',
                            }}
                          >
                            No img
                          </Box>
                        )}
                      </Box>
                    </TableCell>

                    {/* Name + notes preview */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="primary"
                        sx={{ '&:hover': { textDecoration: 'underline' } }}
                      >
                        {loc.name}
                      </Typography>
                      {loc.notes && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220, display: 'block' }}>
                          {loc.notes}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Address */}
                    <TableCell>
                      <Typography variant="body2" color="primary.main">
                        {loc.address}, {loc.city}, {loc.province}
                      </Typography>
                    </TableCell>

                    {/* Tags / Keywords */}
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {loc.keywords.slice(0, 3).map((kw) => (
                          <Chip
                            key={kw}
                            label={kw}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                        {loc.keywords.length > 3 && (
                          <Chip
                            label={`+${loc.keywords.length - 3}`}
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, loc.id)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        component={Link}
                        href={`/locations/${loc.id}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Card>

      {/* Context menu */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleStatusChange('ARCHIVED')}>
          <ArchiveIcon fontSize="small" sx={{ mr: 1 }} /> Archive
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('DELETED')} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  )
}
