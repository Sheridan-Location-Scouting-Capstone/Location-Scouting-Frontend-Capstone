'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Autocomplete,
    Box,
    Card,
    Chip,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArchiveIcon from '@mui/icons-material/Archive'
import DeleteIcon from '@mui/icons-material/Delete'
import { updateLocationStatusAction } from '@/actions/locationActions'
import { useActionRunner } from '@/hooks/useActionRunner'
import { formatAddress } from '@/lib/format'
import Thumbnail from '@/components/common/Thumbnail'
import KeywordPreview from '@/components/common/KeywordPreview'
import ErrorSnackbar from '@/components/common/ErrorSnackbar'

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

export function filterLocations(locations: LocationRow[], search: string, keywords: string[]) {
    const query = search.toLowerCase()
    return locations.filter((location) => {
        const matchesSearch =
            !query ||
            location.name.toLowerCase().includes(query) ||
            location.address.toLowerCase().includes(query) ||
            location.city.toLowerCase().includes(query)

        const matchesKeywords = keywords.length === 0 || keywords.some((keyword) => location.keywords.includes(keyword))

        return matchesSearch && matchesKeywords
    })
}

export default function LocationTable({ locations }: { locations: LocationRow[] }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
    const [menuLocation, setMenuLocation] = useState<LocationRow | null>(null)
    const { run, error, clearError } = useActionRunner()

    // Every keyword in the library, for the filter dropdown
    const allKeywords = useMemo(() => {
        const set = new Set<string>()
        locations.forEach((location) => location.keywords.forEach((keyword) => set.add(keyword)))
        return Array.from(set).sort()
    }, [locations])

    const filtered = useMemo(
        () => filterLocations(locations, search, selectedKeywords),
        [locations, search, selectedKeywords]
    )
    const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, location: LocationRow) => {
        event.stopPropagation()
        setMenuAnchor(event.currentTarget)
        setMenuLocation(location)
    }

    const handleMenuClose = () => {
        setMenuAnchor(null)
        setMenuLocation(null)
    }

    const handleStatusChange = (status: 'ARCHIVED' | 'DELETED') => {
        if (menuLocation) {
            const locationId = menuLocation.id
            run(() => updateLocationStatusAction(locationId, status))
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
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            },
                            htmlInput: { 'aria-label': 'Search locations' },
                        }}
                    />

                    <Autocomplete
                        multiple
                        size="small"
                        options={allKeywords}
                        value={selectedKeywords}
                        onChange={(_, value) => {
                            setSelectedKeywords(value)
                            setPage(0)
                        }}
                        renderInput={(params) => <TextField {...params} label="Filter by Keywords" />}
                        renderValue={(value, getItemProps) =>
                            value.map((option, index) => (
                                <Chip label={option} size="small" {...getItemProps({ index })} key={option} color="primary" variant="outlined" />
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
                                paged.map((location) => (
                                    <TableRow
                                        key={location.id}
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => router.push(`/locations/${location.id}`)}
                                    >
                                        <TableCell sx={{ width: 80 }}>
                                            <Thumbnail url={location.photos[0]?.url} alt={location.name} />
                                        </TableCell>

                                        {/* Name + notes preview */}
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                color="primary"
                                                sx={{ '&:hover': { textDecoration: 'underline' } }}
                                            >
                                                {location.name}
                                            </Typography>
                                            {location.notes && (
                                                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220, display: 'block' }}>
                                                    {location.notes}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="primary.main">
                                                {formatAddress(location)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <KeywordPreview keywords={location.keywords} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                aria-label={`More actions for ${location.name}`}
                                                onClick={(e) => handleMenuOpen(e, location)}
                                            >
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                component={Link}
                                                href={`/locations/${location.id}/edit`}
                                                aria-label={`Edit ${location.name}`}
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

            {/* Row actions */}
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
                {menuLocation?.status !== 'ARCHIVED' && (
                    <MenuItem onClick={() => handleStatusChange('ARCHIVED')}>
                        <ArchiveIcon fontSize="small" sx={{ mr: 1 }} /> Archive
                    </MenuItem>
                )}
                <MenuItem onClick={() => handleStatusChange('DELETED')} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
            </Menu>

            <ErrorSnackbar message={error} onClose={clearError} />
        </Box>
    )
}
