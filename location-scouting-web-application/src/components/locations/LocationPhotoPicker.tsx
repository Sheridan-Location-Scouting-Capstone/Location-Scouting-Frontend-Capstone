'use client'

/* eslint-disable @next/next/no-img-element -- previews are local object URLs */
import { useEffect, useRef } from 'react'
import { Box, Button, Grid, IconButton, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export type PickedPhoto = {
    file: File
    previewUrl: string
    name: string
}

type LocationPhotoPickerProps = {
    photos: PickedPhoto[]
    onChange: (photos: PickedPhoto[]) => void
    disabled?: boolean
}

/**
 * Lets the user pick photos (with optional names) before a location is created. Each preview is an object URL
 * created with its file, so previews can never get out of step with the files they belong to.
 */
export default function LocationPhotoPicker({ photos, onChange, disabled = false }: LocationPhotoPickerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Revoke every preview URL still held when the picker unmounts
    const photosRef = useRef(photos)
    useEffect(() => {
        photosRef.current = photos
    }, [photos])
    useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), [])

    const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? [])
        onChange([
            ...photos,
            ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file), name: '' })),
        ])
        // Clear the input so picking the same file again still fires onChange
        event.target.value = ''
    }

    const handleRemove = (index: number) => {
        URL.revokeObjectURL(photos[index].previewUrl)
        onChange(photos.filter((_, i) => i !== index))
    }

    const handleRename = (index: number, name: string) => {
        onChange(photos.map((photo, i) => (i === index ? { ...photo, name } : photo)))
    }

    return (
        <Box>
            {photos.length > 0 && (
                <Grid container spacing={1} sx={{ mb: 2 }}>
                    {photos.map((photo, index) => (
                        <Grid size={{ xs: 3, sm: 2 }} key={photo.previewUrl}>
                            <Box sx={{ position: 'relative' }}>
                                <img
                                    src={photo.previewUrl}
                                    alt={photo.name || photo.file.name}
                                    style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, display: 'block' }}
                                />
                                <IconButton
                                    size="small"
                                    aria-label={`Remove ${photo.file.name}`}
                                    onClick={() => handleRemove(index)}
                                    disabled={disabled}
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
                                placeholder={photo.file.name}
                                value={photo.name}
                                onChange={(e) => handleRename(index, e.target.value)}
                                disabled={disabled}
                                fullWidth
                                sx={{ mt: 0.5 }}
                                slotProps={{ htmlInput: { 'aria-label': `Name for ${photo.file.name}` } }}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            <Box
                onClick={() => !disabled && fileInputRef.current?.click()}
                sx={{
                    border: '2px dashed',
                    borderColor: 'grey.400',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: disabled ? 'default' : 'pointer',
                    bgcolor: 'grey.50',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: disabled ? 'grey.400' : 'primary.main' },
                }}
            >
                <Button variant="outlined" component="span" disabled={disabled}>
                    Upload Photos
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    hidden
                    data-testid="location-photo-input"
                    onChange={handleSelect}
                />
            </Box>
        </Box>
    )
}
