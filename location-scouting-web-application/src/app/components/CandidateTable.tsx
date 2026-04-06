'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
    Button,
    Menu,
    MenuItem,
    LinearProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { toggleCandidateSelectedAction, removeCandidateAction } from '@/app/actions/candidateActions'

export type CandidateRow = {
    id: string
    selected: boolean
    thumbnailUrl: string | null
    location: {
        id: string
        name: string
        address: string
        city: string
        province: string
        keywords: string[]
        latitude: number | null
        longitude: number | null
    }
    // matchScore and distance are not in schema yet — will come from recommendation algorithm
    // Rendering them as optional so the UI is ready when the service is wired
}

export default function CandidateTable({
    candidates,
    sceneId,
    projectId,
    onAddCandidateAction,
}: {
    candidates: CandidateRow[]
    sceneId: string
    projectId: string
    onAddCandidateAction?: () => void
}) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
    const [menuCandidateId, setMenuCandidateId] = useState<string | null>(null)

    // Collect all keywords from candidate locations for filter dropdown
    const allKeywords = useMemo(() => {
        const set = new Set<string>()
        candidates.forEach((c) => c.location.keywords.forEach((k) => set.add(k)))
        return Array.from(set).sort()
    }, [candidates])

    // Client-side filtering
    const filtered = useMemo(() => {
        return candidates.filter((c) => {
            const loc = c.location
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
    }, [candidates, search, selectedKeywords])

    const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, candidateId: string) => {
        event.stopPropagation()
        setMenuAnchor(event.currentTarget)
        setMenuCandidateId(candidateId)
    }

    const handleMenuClose = () => {
        setMenuAnchor(null)
        setMenuCandidateId(null)
    }

    const handleToggleSelected = async (candidateId: string, currentlySelected: boolean) => {
        await toggleCandidateSelectedAction(candidateId, !currentlySelected, sceneId, projectId)
        handleMenuClose()
    }

    const handleRemove = async (candidateId: string) => {
        await removeCandidateAction(candidateId, sceneId, projectId)
        handleMenuClose()
    }

    // ─── Empty State ────────────────────────────────────────

    if (candidates.length === 0) {
        return (
            <Box>
                {/* Section header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h6">Location Candidates</Typography>
                        <Chip label="0" size="small" color="primary" variant="outlined" />
                    </Box>
                </Box>

                <Card sx={{ p: 6, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        No candidates yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Add locations from your library or let AI find matches for this scene.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={onAddCandidateAction}
                        >
                            Add Candidate
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<AutoAwesomeIcon />}
                        >
                            Get Recommendations
                        </Button>
                    </Box>
                </Card>
            </Box>
        )
    }

    // ─── Populated State ────────────────────────────────────

    return (
        <Box>
            {/* Section header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6">Location Candidates</Typography>
                    <Chip
                        label={candidates.length}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AutoAwesomeIcon />}
                >
                    Get Recommendations
                </Button>
            </Box>

            {/* Filters */}
            <Card sx={{ p: 2.5, mb: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        placeholder="Search candidates..."
                        size="small"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(0)
                        }}
                        sx={{ minWidth: 220 }}
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
                        sx={{ minWidth: 240 }}
                    />
                </Box>
            </Card>

            {/* Results count */}
            <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderLeft: 1, borderRight: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {filtered.length} Result{filtered.length !== 1 ? 's' : ''}
                </Typography>
            </Box>

            {/* Table */}
            <Card sx={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Thumbnail</TableCell>
                                <TableCell>Location Name</TableCell>
                                <TableCell>Address</TableCell>
                                <TableCell>Tags</TableCell>
                                {/* TODO: Match Score column — wire to recommendation algorithm */}
                                {/* <TableCell>Match</TableCell> */}
                                {/* TODO: Distance column — wire to Haversine service */}
                                {/* <TableCell>Distance</TableCell> */}
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paged.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">
                                            No candidates match your search.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paged.map((candidate) => {
                                    const loc = candidate.location
                                    return (
                                        <TableRow
                                            key={candidate.id}
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
                                                    {candidate.thumbnailUrl ? (
                                                        <img
                                                            src={candidate.thumbnailUrl}
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

                                            {/* Location Name */}
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    color="primary"
                                                    sx={{ '&:hover': { textDecoration: 'underline' } }}
                                                >
                                                    {loc.name}
                                                </Typography>
                                            </TableCell>

                                            {/* Address */}
                                            <TableCell>
                                                <Typography variant="body2" color="primary.main">
                                                    {loc.address}, {loc.city}, {loc.province}
                                                </Typography>
                                            </TableCell>

                                            {/* Tags */}
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

                                            {/* Status */}
                                            <TableCell>
                                                {candidate.selected ? (
                                                    <Chip
                                                        icon={<CheckCircleIcon />}
                                                        label="Selected"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                ) : (
                                                    <Chip
                                                        label="Candidate"
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleMenuOpen(e, candidate.id)}
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        router.push(`/locations/${loc.id}`)
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {filtered.length > rowsPerPage && (
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
                )}
            </Card>

            {/* Context menu */}
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={handleMenuClose}>
                {menuCandidateId && (() => {
                    const candidate = candidates.find((c) => c.id === menuCandidateId)
                    if (!candidate) return null
                    return [
                        <MenuItem
                            key="toggle"
                            onClick={() => handleToggleSelected(menuCandidateId, candidate.selected)}
                        >
                            {candidate.selected ? (
                                <>
                                    <RemoveCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                                    Deselect Location
                                </>
                            ) : (
                                <>
                                    <CheckCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                                    Select as Location
                                </>
                            )}
                        </MenuItem>,
                        // TODO: "Highlight Photos" menu item — opens photo selection dialog
                        // TODO: "Add Notes" menu item — opens notes dialog
                        <MenuItem
                            key="remove"
                            onClick={() => handleRemove(menuCandidateId)}
                            sx={{ color: 'error.main' }}
                        >
                            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                            Remove Candidate
                        </MenuItem>,
                    ]
                })()}
            </Menu>
        </Box>
    )
}
