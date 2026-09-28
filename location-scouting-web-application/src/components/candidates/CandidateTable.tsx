'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Autocomplete,
    Box,
    Button,
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
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { removeCandidateAction, toggleCandidateSelectedAction } from '@/actions/candidateActions'
import { useActionRunner } from '@/hooks/useActionRunner'
import { isActionFailure } from '@/lib/actionResult'
import { formatAddress } from '@/lib/format'
import Thumbnail from '@/components/common/Thumbnail'
import KeywordPreview from '@/components/common/KeywordPreview'
import ErrorSnackbar from '@/components/common/ErrorSnackbar'
import MatchScoreBar from '@/components/candidates/MatchScoreBar'

export type CandidateRow = {
    id: string
    selected: boolean
    thumbnailUrl: string | null
    matchScore: number | null
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
}

/** Search + keyword filter, with selected candidates floated to the top */
export function filterCandidates(candidates: CandidateRow[], search: string, keywords: string[]) {
    const query = search.toLowerCase()
    return candidates
        .filter(({ location }) => {
            const matchesSearch =
                !query ||
                location.name.toLowerCase().includes(query) ||
                location.address.toLowerCase().includes(query) ||
                location.city.toLowerCase().includes(query)

            const matchesKeywords = keywords.length === 0 || keywords.some((keyword) => location.keywords.includes(keyword))

            return matchesSearch && matchesKeywords
        })
        .sort((a, b) => Number(b.selected) - Number(a.selected))
}

type CandidateTableProps = {
    candidates: CandidateRow[]
    sceneId: string
    projectId: string
    onAddCandidateAction?: () => void
    onGetRecommendationsAction?: () => void
}

export default function CandidateTable({
    candidates,
    sceneId,
    projectId,
    onAddCandidateAction,
    onGetRecommendationsAction,
}: CandidateTableProps) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
    const [menuCandidateId, setMenuCandidateId] = useState<string | null>(null)
    const [highlightedId, setHighlightedId] = useState<string | null>(null)
    const [toggleError, setToggleError] = useState<string | null>(null)
    const remover = useActionRunner()

    // ─── Optimistic selection ───────────────────────────────
    // The optimistic flip lives inside the transition, so React reverts it on its own if the action fails
    const [isToggling, startToggleTransition] = useTransition()
    const [optimisticCandidates, applyOptimisticToggle] = useOptimistic(candidates, (state, candidateId: string) =>
        state.map((candidate) => (candidate.id === candidateId ? { ...candidate, selected: !candidate.selected } : candidate))
    )

    // ─── Derived data ───────────────────────────────────────
    const allKeywords = useMemo(() => {
        const set = new Set<string>()
        optimisticCandidates.forEach((candidate) => candidate.location.keywords.forEach((keyword) => set.add(keyword)))
        return Array.from(set).sort()
    }, [optimisticCandidates])

    const filtered = useMemo(
        () => filterCandidates(optimisticCandidates, search, selectedKeywords),
        [optimisticCandidates, search, selectedKeywords]
    )
    const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    const menuCandidate = optimisticCandidates.find((candidate) => candidate.id === menuCandidateId) ?? null

    // ─── Handlers ───────────────────────────────────────────
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, candidateId: string) => {
        event.stopPropagation()
        setMenuAnchor(event.currentTarget)
        setMenuCandidateId(candidateId)
    }

    const handleMenuClose = () => {
        setMenuAnchor(null)
        setMenuCandidateId(null)
    }

    const handleToggleSelected = (candidateId: string, currentlySelected: boolean) => {
        setHighlightedId(candidateId)
        setToggleError(null)
        startToggleTransition(async () => {
            applyOptimisticToggle(candidateId)
            const result = await toggleCandidateSelectedAction(candidateId, !currentlySelected, sceneId, projectId)
            if (isActionFailure(result)) setToggleError(result.error)
        })
        setTimeout(() => setHighlightedId(null), 1000)
    }

    const handleRemove = (candidateId: string) => {
        remover.run(() => removeCandidateAction(candidateId, sceneId, projectId))
        handleMenuClose()
    }

    const header = (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h6" component="h2">Location Candidates</Typography>
                <Chip label={candidates.length} size="small" color="primary" variant="outlined" />
            </Box>
            {candidates.length > 0 && (
                <Button variant="outlined" size="small" startIcon={<AutoAwesomeIcon />} onClick={onGetRecommendationsAction}>
                    Get Recommendations
                </Button>
            )}
        </Box>
    )

    const errorSnackbar = (
        <ErrorSnackbar
            message={toggleError ?? remover.error}
            onClose={() => {
                setToggleError(null)
                remover.clearError()
            }}
        />
    )

    // ─── Empty state ────────────────────────────────────────
    if (candidates.length === 0) {
        return (
            <Box>
                {header}
                <Card sx={{ p: 6, textAlign: 'center' }}>
                    <Typography variant="h6" component="p" color="text.secondary" sx={{ mb: 1 }}>
                        No candidates yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Add locations from your library or let AI find matches for this scene.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddCandidateAction}>
                            Add Candidate
                        </Button>
                        <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={onGetRecommendationsAction}>
                            Get Recommendations
                        </Button>
                    </Box>
                </Card>
                {errorSnackbar}
            </Box>
        )
    }

    // ─── Populated state ────────────────────────────────────
    return (
        <Box>
            {header}

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
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            },
                            htmlInput: { 'aria-label': 'Search candidates' },
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

            <Card sx={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Thumbnail</TableCell>
                                <TableCell>Location Name</TableCell>
                                <TableCell>Address</TableCell>
                                <TableCell>Tags</TableCell>
                                <TableCell>Match</TableCell>
                                {/* TODO: Distance column — wire to Haversine service */}
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paged.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">No candidates match your search.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paged.map((candidate) => {
                                    const location = candidate.location
                                    const isHighlighted = highlightedId === candidate.id

                                    return (
                                        <TableRow
                                            key={candidate.id}
                                            hover
                                            data-testid="candidate-row"
                                            sx={{
                                                cursor: 'pointer',
                                                ...(isHighlighted && {
                                                    animation: 'candidateHighlight 1s ease-out',
                                                    '@keyframes candidateHighlight': {
                                                        '0%': { backgroundColor: candidate.selected ? 'rgba(102, 187, 106, 0.25)' : 'rgba(0,0,0,0.06)' },
                                                        '100%': { backgroundColor: 'transparent' },
                                                    },
                                                }),
                                            }}
                                            onClick={() => router.push(`/productions/${projectId}/scenes/${sceneId}/candidate/${candidate.id}`)}
                                        >
                                            <TableCell sx={{ width: 80 }}>
                                                <Thumbnail url={candidate.thumbnailUrl} alt={location.name} />
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600} color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                                                    {location.name}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2" color="primary.main">{formatAddress(location)}</Typography>
                                            </TableCell>

                                            <TableCell>
                                                <KeywordPreview keywords={location.keywords} />
                                            </TableCell>

                                            <TableCell>
                                                <MatchScoreBar score={candidate.matchScore} />
                                            </TableCell>

                                            {/* Status — click to toggle */}
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Chip
                                                    icon={candidate.selected ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
                                                    label={candidate.selected ? 'Selected' : 'Candidate'}
                                                    size="small"
                                                    color={candidate.selected ? 'success' : 'default'}
                                                    variant={candidate.selected ? 'filled' : 'outlined'}
                                                    onClick={() => handleToggleSelected(candidate.id, candidate.selected)}
                                                    disabled={isToggling}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': { transform: isToggling ? 'none' : 'scale(1.05)' },
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    aria-label={`More actions for ${location.name}`}
                                                    onClick={(e) => handleMenuOpen(e, candidate.id)}
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    component={Link}
                                                    href={`/locations/${location.id}/edit`}
                                                    aria-label={`Edit location ${location.name}`}
                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
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

            {/* Row actions */}
            {/* TODO: "Highlight Photos" menu item — opens photo selection dialog */}
            {/* TODO: "Add Notes" menu item — opens notes dialog */}
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor) && Boolean(menuCandidate)} onClose={handleMenuClose}>
                {menuCandidate && [
                    <MenuItem
                        key="toggle"
                        onClick={() => {
                            handleToggleSelected(menuCandidate.id, menuCandidate.selected)
                            handleMenuClose()
                        }}
                    >
                        {menuCandidate.selected ? (
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
                    <MenuItem key="remove" onClick={() => handleRemove(menuCandidate.id)} sx={{ color: 'error.main' }}>
                        <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                        Remove Candidate
                    </MenuItem>,
                ]}
            </Menu>

            {errorSnackbar}
        </Box>
    )
}
