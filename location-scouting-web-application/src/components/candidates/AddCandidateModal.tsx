'use client'

/* eslint-disable @next/next/no-img-element -- photos are served from MinIO at runtime-configured hosts */
import { useState, useMemo } from 'react'
import {
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    InputAdornment,
    Box,
    Typography,
    Chip,
    Stepper,
    Step,
    StepLabel,
    IconButton,
    CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { getLocationAction } from '@/actions/locationActions'
import { addCandidateAction } from '@/actions/candidateActions'
import { isActionFailure } from '@/lib/actionResult'
import { ErrorCode } from '@/schemas/result'
import { formatAddress } from '@/lib/format'
import Thumbnail from '@/components/common/Thumbnail'

// ─── Types ──────────────────────────────────────────────────

// Matches what getLocationsAction returns (location + first photo only)
export type LocationForPicker = {
    id: string
    name: string
    address: string
    city: string
    province: string
    keywords: string[]
    photos: { id: string; url: string }[]
}

type PhotoForSelector = {
    id: string
    url: string
    name: string | null
    displayOrder: number
}

// ─── Props ──────────────────────────────────────────────────

type AddCandidateModalProps = {
    open: boolean
    onCloseAction: () => void
    locations: LocationForPicker[]
    candidatedLocationIds: string[]
    sceneId: string
    projectId: string
}

// ─── Steps ──────────────────────────────────────────────────

const STEPS = ['Select Location', 'Select Photos']

// ─── AddCandidateModal ──────────────────────────────────────

export default function AddCandidateModal({
                                              open,
                                              onCloseAction,
                                              locations,
                                              candidatedLocationIds,
                                              sceneId,
                                              projectId,
                                          }: AddCandidateModalProps) {
    const [activeStep, setActiveStep] = useState(0)
    const [selectedLocation, setSelectedLocation] = useState<LocationForPicker | null>(null)
    const [locationPhotos, setLocationPhotos] = useState<PhotoForSelector[]>([])
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
    const [loadingPhotos, setLoadingPhotos] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ── Reset state on close ──

    const handleClose = () => {
        setActiveStep(0)
        setSelectedLocation(null)
        setLocationPhotos([])
        setSelectedPhotoIds([])
        setLoadingPhotos(false)
        setSubmitting(false)
        setError(null)
        onCloseAction()
    }

    // Adds the candidate and closes on success; on failure the dialog stays open with the reason
    const addCandidate = async (locationId: string, photoIds: string[]) => {
        setSubmitting(true)
        const result = await addCandidateAction(sceneId, locationId, projectId, photoIds)
        setSubmitting(false)
        if (isActionFailure(result)) {
            setError(result.error)
            return
        }
        handleClose()
    }

    // ── Step 1: Location selected ──

    const handleLocationSelect = async (location: LocationForPicker) => {
        setError(null)
        setSelectedLocation(location)
        setSelectedPhotoIds([])
        setLoadingPhotos(true)

        // Fetch the full photo list for this location
        const result = await getLocationAction(location.id)
        setLoadingPhotos(false)
        if (!result.success) {
            setSelectedLocation(null)
            setError(result.code === ErrorCode.NOT_FOUND ? 'That location is no longer available.' : result.error)
            return
        }

        const photos: PhotoForSelector[] = result.data.photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            name: photo.name,
            displayOrder: photo.displayOrder,
        }))
        setLocationPhotos(photos)

        if (photos.length === 0) {
            // No photos to choose from, so add it straight away
            await addCandidate(location.id, [])
        } else {
            setActiveStep(1)
        }
    }

    // ── Step 2: Photo toggling ──

    const handlePhotoToggle = (photoId: string) => {
        setSelectedPhotoIds((prev) =>
            prev.includes(photoId)
                ? prev.filter((id) => id !== photoId)
                : [...prev, photoId]
        )
    }

    const handleSelectAll = () => {
        setSelectedPhotoIds(locationPhotos.map((p) => p.id))
    }

    const handleDeselectAll = () => {
        setSelectedPhotoIds([])
    }

    // ── Back to step 1 ──

    const handleBack = () => {
        setError(null)
        setActiveStep(0)
        setSelectedLocation(null)
        setLocationPhotos([])
        setSelectedPhotoIds([])
    }

    // ── Submit ──

    const handleConfirm = async () => {
        if (!selectedLocation || selectedPhotoIds.length === 0) return
        await addCandidate(selectedLocation.id, selectedPhotoIds)
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '85vh' } } }}
        >
            {/* ── Header ── */}
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography component="span" variant="h6" fontWeight={700}>
                    Add Candidate
                </Typography>
                <IconButton onClick={handleClose} size="small" aria-label="Close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* ── Stepper ── */}
            <Box sx={{ px: 3, pb: 2 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            {/* ── Content ── */}
            <DialogContent dividers sx={{ px: 3, py: 2 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {activeStep === 0 && (submitting || loadingPhotos) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress aria-label="Adding candidate" />
                    </Box>
                )}

                {activeStep === 0 && !submitting && !loadingPhotos && (
                    <LocationPicker
                        locations={locations}
                        candidatedLocationIds={candidatedLocationIds}
                        onSelect={handleLocationSelect}
                    />
                )}

                {activeStep === 1 && (
                    loadingPhotos ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <PhotoSelector
                            location={selectedLocation!}
                            photos={locationPhotos}
                            selectedPhotoIds={selectedPhotoIds}
                            onToggle={handlePhotoToggle}
                            onSelectAll={handleSelectAll}
                            onDeselectAll={handleDeselectAll}
                        />
                    )
                )}
            </DialogContent>

            {/* ── Footer ── */}
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button
                    onClick={activeStep === 0 ? handleClose : handleBack}
                    variant="outlined"
                >
                    {activeStep === 0 ? 'Cancel' : '← Back'}
                </Button>

                {activeStep === 1 && (
                    <Button
                        variant="contained"
                        onClick={handleConfirm}
                        disabled={selectedPhotoIds.length === 0 || submitting}
                        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {submitting
                            ? 'Adding...'
                            : `Add Candidate (${selectedPhotoIds.length} photo${selectedPhotoIds.length !== 1 ? 's' : ''})`
                        }
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    )
}

// ─── LocationPicker (Step 1) ────────────────────────────────

function LocationPicker({
                            locations,
                            candidatedLocationIds,
                            onSelect,
                        }: {
    locations: LocationForPicker[]
    candidatedLocationIds: string[]
    onSelect: (location: LocationForPicker) => void
}) {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search) return locations
        const q = search.toLowerCase()
        return locations.filter(
            (loc) =>
                loc.name.toLowerCase().includes(q) ||
                loc.address.toLowerCase().includes(q) ||
                loc.city.toLowerCase().includes(q)
        )
    }, [locations, search])

    return (
        <Box>
            {/* Search */}
            <TextField
                placeholder="Search locations by name or address..."
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 1.5 }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                    },
                }}
            />

            {/* Results count */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                {filtered.length} location{filtered.length !== 1 ? 's' : ''}
            </Typography>

            {/* Location list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 380, overflowY: 'auto' }}>
                {filtered.map((loc) => {
                    const isDisabled = candidatedLocationIds.includes(loc.id)
                    const thumbnailUrl = loc.photos?.[0]?.url ?? null

                    return (
                        <Box
                            key={loc.id}
                            role="button"
                            aria-disabled={isDisabled}
                            data-testid="candidate-location-option"
                            onClick={isDisabled ? undefined : () => onSelect(loc)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1.5,
                                border: 1,
                                borderColor: isDisabled ? 'action.disabled' : 'divider',
                                borderRadius: 2,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.5 : 1,
                                bgcolor: isDisabled ? 'action.disabledBackground' : 'background.paper',
                                transition: 'all 0.15s ease',
                                '&:hover': isDisabled
                                    ? {}
                                    : {
                                        borderColor: 'primary.main',
                                        bgcolor: 'primary.50',
                                    },
                            }}
                        >
                            <Thumbnail url={thumbnailUrl} alt={loc.name} width={56} height={42} grayscale={isDisabled} />

                            {/* Location info */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {loc.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {formatAddress(loc)}
                                </Typography>
                            </Box>

                            {/* Already added badge OR keywords */}
                            {isDisabled ? (
                                <Chip
                                    label="Already Added"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                />
                            ) : (
                                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                    {loc.keywords.slice(0, 2).map((kw) => (
                                        <Chip
                                            key={kw}
                                            label={kw}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            sx={{ fontSize: '0.7rem' }}
                                        />
                                    ))}
                                    {loc.keywords.length > 2 && (
                                        <Chip
                                            label={`+${loc.keywords.length - 2}`}
                                            size="small"
                                            sx={{ fontSize: '0.7rem' }}
                                        />
                                    )}
                                </Box>
                            )}
                        </Box>
                    )
                })}

                {filtered.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                            No locations match your search.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    )
}

// ─── PhotoSelector (Step 2) ─────────────────────────────────

function PhotoSelector({
                           location,
                           photos,
                           selectedPhotoIds,
                           onToggle,
                           onSelectAll,
                           onDeselectAll,
                       }: {
    location: LocationForPicker
    photos: PhotoForSelector[]
    selectedPhotoIds: string[]
    onToggle: (photoId: string) => void
    onSelectAll: () => void
    onDeselectAll: () => void
}) {
    const allSelected = selectedPhotoIds.length === photos.length

    return (
        <Box>
            {/* Selected location summary */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'primary.50',
                    border: 1,
                    borderColor: 'primary.200',
                    mb: 2,
                }}
            >
                <CheckCircleIcon color="primary" fontSize="small" />
                <Box>
                    <Typography variant="body2" fontWeight={600}>
                        {location.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {location.address}, {location.city}
                    </Typography>
                </Box>
            </Box>

            {/* Select all / count */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {selectedPhotoIds.length} of {photos.length} selected
                </Typography>
                <Button
                    size="small"
                    onClick={allSelected ? onDeselectAll : onSelectAll}
                >
                    {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
            </Box>

            {/* Photo grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                    maxHeight: 340,
                    overflowY: 'auto',
                }}
            >
                {photos.map((photo) => {
                    const isSelected = selectedPhotoIds.includes(photo.id)

                    return (
                        <Box
                            key={photo.id}
                            onClick={() => onToggle(photo.id)}
                            sx={{
                                position: 'relative',
                                borderRadius: 2,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: 2,
                                borderColor: isSelected ? 'primary.main' : 'transparent',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    borderColor: isSelected ? 'primary.main' : 'divider',
                                },
                            }}
                        >
                            <img
                                src={photo.url}
                                alt={photo.name ?? 'Location photo'}
                                style={{
                                    width: '100%',
                                    height: 120,
                                    objectFit: 'cover',
                                    display: 'block',
                                    opacity: isSelected ? 1 : 0.7,
                                    transition: 'opacity 0.15s ease',
                                }}
                            />

                            {/* Checkbox overlay */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 6,
                                    left: 6,
                                    width: 22,
                                    height: 22,
                                    borderRadius: 0.75,
                                    border: 2,
                                    borderColor: isSelected ? 'primary.main' : '#fff',
                                    bgcolor: isSelected ? 'primary.main' : 'rgba(255,255,255,0.6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isSelected ? 'none' : '0 1px 3px rgba(0,0,0,0.3)',
                                }}
                            >
                                {isSelected && (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path
                                            d="M2.5 6L5 8.5L9.5 3.5"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </Box>

                            {/* Photo name label */}
                            {photo.name && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                                        px: 1,
                                        pt: 2,
                                        pb: 0.5,
                                    }}
                                >
                                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500 }}>
                                        {photo.name}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )
                })}
            </Box>

            {photos.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                        This location has no photos.
                    </Typography>
                </Box>
            )}
        </Box>
    )
}