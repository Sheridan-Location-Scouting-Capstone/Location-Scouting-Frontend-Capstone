'use client'

import { useMemo, useRef, useState } from 'react'
import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteIcon from '@mui/icons-material/Delete'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import EditIcon from '@mui/icons-material/Edit'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
    addPhotosAction,
    deletePhotoAction,
    updatePhotoDisplayOrderAction,
    updatePhotoNameAction,
} from '@/actions/locationActions'
import { useActionRunner } from '@/hooks/useActionRunner'
import ErrorSnackbar from '@/components/common/ErrorSnackbar'

export type GalleryPhoto = {
    id: string
    name: string | null
    url: string
    displayOrder: number
}

/**
 * Applies a locally dragged order on top of the server's photos. The local order is ignored as soon as the
 * photo set changes (upload/delete), so the server's list always wins once it disagrees.
 */
export function applyPendingOrder(photos: GalleryPhoto[], pendingOrder: string[] | null) {
    if (!pendingOrder || pendingOrder.length !== photos.length) return photos
    const byId = new Map(photos.map((photo) => [photo.id, photo]))
    if (pendingOrder.some((id) => !byId.has(id))) return photos
    return pendingOrder.map((id) => byId.get(id)!)
}

function SortablePhoto({ photo, index, isSelected, onSelect }: {
    photo: GalleryPhoto
    index: number
    isSelected: boolean
    onSelect: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.id })

    return (
        <Box
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            onClick={onSelect}
            data-testid="gallery-thumbnail"
            aria-selected={isSelected}
            sx={{
                position: 'relative',
                aspectRatio: '4/3',
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                outline: isSelected ? '3px solid' : '2px solid transparent',
                outlineColor: isSelected ? 'primary.main' : 'transparent',
                transition: 'outline-color 0.15s',
                '&:hover': { outlineColor: isSelected ? 'primary.main' : 'grey.500' },
            }}
        >
            <IconButton
                size="small"
                aria-label={`Drag to reorder ${photo.name || `photo ${index + 1}`}`}
                {...attributes}
                {...listeners}
                sx={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    cursor: 'grab',
                    zIndex: 1,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
            >
                <DragIndicatorIcon fontSize="small" />
            </IconButton>
            <Box
                component="img"
                src={photo.url}
                alt={photo.name || `Photo ${index + 1}`}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
        </Box>
    )
}

export default function LocationPhotoGallery({ photos, locationId }: { photos: GalleryPhoto[]; locationId: string }) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState('')
    const upload = useActionRunner()
    const edit = useActionRunner()
    const error = upload.error ?? edit.error
    const clearError = () => {
        upload.clearError()
        edit.clearError()
    }

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    // The thumbnails and the preview both read from this one ordered list
    const orderedPhotos = useMemo(() => applyPendingOrder(photos, pendingOrder), [photos, pendingOrder])
    const selectedPhoto = orderedPhotos.find((photo) => photo.id === selectedId) ?? orderedPhotos[0] ?? null

    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? [])
        // Clear the input so choosing the same file again still triggers an upload
        event.target.value = ''
        if (files.length === 0) return

        const formData = new FormData()
        files.forEach((file) => formData.append('photos', file))
        upload.run(() => addPhotosAction(locationId, formData))
    }

    const handleDelete = (photoId: string) => {
        // Keep the selection in place: select the photo that takes the deleted one's slot
        const index = orderedPhotos.findIndex((photo) => photo.id === photoId)
        const remaining = orderedPhotos.filter((photo) => photo.id !== photoId)
        const next = remaining[Math.min(index, remaining.length - 1)] ?? null

        edit.run(() => deletePhotoAction(photoId, locationId), { onSuccess: () => setSelectedId(next?.id ?? null) })
    }

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return

        const oldIndex = orderedPhotos.findIndex((photo) => photo.id === active.id)
        const newIndex = orderedPhotos.findIndex((photo) => photo.id === over.id)
        const reordered = arrayMove(orderedPhotos, oldIndex, newIndex).map((photo) => photo.id)

        setPendingOrder(reordered)
        // Snap back to the saved order if the reorder couldn't be persisted
        edit.run(() => updatePhotoDisplayOrderAction(locationId, reordered), { onFailure: () => setPendingOrder(null) })
    }

    const startEditingName = () => {
        if (!selectedPhoto) return
        setNameValue(selectedPhoto.name || '')
        setEditingName(true)
    }

    // Enter blurs the field and the blur saves, so each edit is saved exactly once
    const saveName = () => {
        if (!selectedPhoto) return
        setEditingName(false)
        if (nameValue !== (selectedPhoto.name || '')) {
            const photoId = selectedPhoto.id
            edit.run(() => updatePhotoNameAction(photoId, nameValue, locationId))
        }
    }

    const uploadInput = (
        <input ref={fileInputRef} type="file" multiple accept="image/*" hidden data-testid="gallery-upload-input" onChange={handleUpload} />
    )

    if (photos.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 6, border: '2px dashed', borderColor: 'grey.400', borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                    No photos yet. Upload photos to showcase this location.
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<AddPhotoAlternateIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                >
                    {upload.isPending ? 'Uploading...' : 'Upload Photos'}
                </Button>
                {uploadInput}
                <ErrorSnackbar message={error} onClose={clearError} />
            </Box>
        )
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">Photos ({photos.length})</Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddPhotoAlternateIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                >
                    {upload.isPending ? 'Uploading...' : 'Add Photos'}
                </Button>
                {uploadInput}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Thumbnail grid */}
                <DndContext id="photo-gallery-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedPhotos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
                        <Box
                            sx={{
                                width: 340,
                                flexShrink: 0,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 1,
                                alignContent: 'start',
                                maxHeight: 600,
                                overflowY: 'auto',
                            }}
                        >
                            {orderedPhotos.map((photo, index) => (
                                <SortablePhoto
                                    key={photo.id}
                                    photo={photo}
                                    index={index}
                                    isSelected={photo.id === selectedPhoto?.id}
                                    onSelect={() => setSelectedId(photo.id)}
                                />
                            ))}
                        </Box>
                    </SortableContext>
                </DndContext>

                {/* Large preview */}
                {selectedPhoto && (
                    <Box sx={{ flexGrow: 1, position: 'relative' }}>
                        <Box
                            component="img"
                            src={selectedPhoto.url}
                            alt={selectedPhoto.name || 'Selected photo'}
                            data-testid="gallery-preview"
                            sx={{ width: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 2, bgcolor: 'grey.100' }}
                        />

                        {editingName ? (
                            <TextField
                                size="small"
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                    if (e.key === 'Escape') setEditingName(false)
                                }}
                                onBlur={saveName}
                                autoFocus
                                sx={{ mt: 1 }}
                                slotProps={{ htmlInput: { 'aria-label': 'Photo name' } }}
                            />
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    {selectedPhoto.name || 'Untitled'}
                                </Typography>
                                <IconButton size="small" aria-label="Rename photo" onClick={startEditingName}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        )}

                        <IconButton
                            size="small"
                            aria-label="Delete photo"
                            onClick={() => handleDelete(selectedPhoto.id)}
                            disabled={edit.isPending}
                            sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                bgcolor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.main' },
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                )}
            </Box>

            <ErrorSnackbar message={error} onClose={clearError} />
        </Box>
    )
}
