'use client'

import {useState, useRef, useEffect} from 'react'
import {
    Box,
    Typography,
    IconButton,
    Button, TextField,
} from '@mui/material'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
} from '@dnd-kit/sortable'
import DeleteIcon from '@mui/icons-material/Delete'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import {
    addPhotosAction,
    deletePhotoAction,
    updatePhotoDisplayOrderAction,
    updatePhotoNameAction
} from '@/app/actions/locationActions'
import EditIcon from "@mui/icons-material/Edit";
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

function SortablePhoto({ photo, index, isSelected, onClick }: {
    photo: Photo
    index: number
    isSelected: boolean
    onClick: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    }

    return (
        <Box
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            sx={{
                position: 'relative',
                aspectRatio: '4/3',
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                outline: isSelected ? '3px solid' : '2px solid transparent',
                outlineColor: isSelected ? 'primary.main' : 'transparent',
                transition: 'outline-color 0.15s',
                '&:hover': {
                    outlineColor: isSelected ? 'primary.main' : '#B0B0B0',
                },
            }}
            >
            {/* Drag handle */}
            <IconButton
                size="small"
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
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)'},
                }}
                >
                <DragIndicatorIcon fontSize="small"/>
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

type Photo = {
  id: string
  name: string | null
  url: string
  displayOrder: number
}

export default function LocationPhotoGallery({
  photos,
  locationId,
}: {
  photos: Photo[]
  locationId: string
}) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState('')
    const [orderedPhotos, setOrderedPhotos] = useState(photos)

    useEffect(() => {
        setOrderedPhotos(photos)
    }, [photos])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    )

  const selectedPhoto = photos[selectedIndex] || null

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append('photos', f))

    await addPhotosAction(locationId, formData)
    setUploading(false)
  }

  const handleDelete = async (photoId: string) => {
    await deletePhotoAction(photoId, locationId)
    if (selectedIndex >= photos.length - 1) {
      setSelectedIndex(Math.max(0, photos.length - 2))
    }
  }

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        // active = the photo being dragged
        // over = the photo it was dropped on
        if (!over || active.id === over.id) return

        const oldIndex = orderedPhotos.findIndex(p => p.id === active.id)
        const newIndex = orderedPhotos.findIndex(p => p.id === over.id)

        // arrayMove is a dnd-kit utility — takes the array, swaps the item
        // from oldIndex to newIndex, returns a new array
        const reordered = arrayMove(orderedPhotos, oldIndex, newIndex)

        setOrderedPhotos(reordered)  // update UI immediately
        updatePhotoDisplayOrderAction(locationId, reordered.map(p => p.id))  // persist to DB
    }

  if (photos.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          border: '2px dashed #D0D0D0',
          borderRadius: 2,
          bgcolor: '#FAFAFA',
        }}
      >
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No photos yet. Upload photos to showcase this location.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Photos'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          hidden
          onChange={handleUpload}
        />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Photos ({photos.length})
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Add Photos'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          hidden
          onChange={handleUpload}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Thumbnail grid — left side */}
          <DndContext id="photo-gallery-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
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
          {orderedPhotos.map((photo, idx) => (
            <SortablePhoto
              key={photo.id}
              photo={photo}
              index={idx}
              isSelected={idx === selectedIndex }
              onClick={() => setSelectedIndex(idx) }
              />
          ))}
        </Box>
      </SortableContext>
  </DndContext>


        {/* Large preview — right side */}
        {selectedPhoto && (
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <Box
              component="img"
              src={selectedPhoto.url}
              alt={selectedPhoto.name || 'Selected photo'}
              sx={{
                width: '100%',
                maxHeight: 600,
                objectFit: 'contain',
                borderRadius: 2,
                bgcolor: '#F0F0F0',
              }}
            />
            {/* Photo name label */}
              {editingName ? (
                  <TextField
                      size="small"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              updatePhotoNameAction(selectedPhoto.id, nameValue, locationId)
                              setEditingName(false)
                          }
                          if (e.key === 'Escape') {
                              setEditingName(false)
                          }
                      }}
                      onBlur={() => {
                          updatePhotoNameAction(selectedPhoto.id, nameValue, locationId)
                          setEditingName(false)
                      }}
                      autoFocus
                      sx={{ mt: 1 }}
                  />
              ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          {selectedPhoto.name || 'Untitled'}
                      </Typography>
                      <IconButton
                          size="small"
                          onClick={() => {
                              setNameValue(selectedPhoto.name || '')
                              setEditingName(true)
                          }}
                      >
                          <EditIcon fontSize="small" />
                      </IconButton>
                  </Box>
              )}
            {/* Delete button */}
            <IconButton
              size="small"
              onClick={() => handleDelete(selectedPhoto.id)}
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
    </Box>
  )
}
