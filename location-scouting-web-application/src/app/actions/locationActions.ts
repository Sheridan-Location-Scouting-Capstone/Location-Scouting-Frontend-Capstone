'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import {
  createLocation, deleteLocationById,
  // getLocation,
  getLocationWithPhotos,
  updateLocation,
  // updateLocationStatus,
  // searchLocations,
  // filterByKeywords,
} from '@/app/services/locationService'
import {
  addPhotosToLocation,
  removePhotosFromLocation, updatePhoto, updatePhotoDisplayOrder
} from '@/app/services/locationPhotoService'

// ─── List / Search ──────────────────────────────────────────

export async function getLocationsAction(query?: string, keywords?: string[]) {
  if (query) {
   // return await searchLocations(query)
  }
  if (keywords && keywords.length > 0) {
   // return await filterByKeywords(keywords)
  }
  // Default: return all locations, newest first
  return await prisma.location.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      photos: {
        orderBy: { displayOrder: 'asc' },
        take: 1, // just the thumbnail
      },
    },
  })
}

// ─── Single Location ────────────────────────────────────────

export async function getLocationAction(id: string) {
  return await getLocationWithPhotos(id)
}

// ─── Create ─────────────────────────────────────────────────

export async function createLocationAction(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    province: formData.get('province') as string,
    postalCode: formData.get('postalCode') as string,
    country: (formData.get('country') as string) || 'Canada',
    notes: (formData.get('notes') as string) || undefined,
    contactName: (formData.get('contactName') as string) || undefined,
    contactPhone: (formData.get('contactPhone') as string) || undefined,
    contactEmail: (formData.get('contactEmail') as string) || undefined,
    keywords: formData.get('keywords')
      ? (formData.get('keywords') as string).split(',').map((k) => k.trim()).filter(Boolean)
      : [],
  }

  // Collect photo files
  const photoFiles = formData.getAll('photos') as File[]
  const photoNames = formData.getAll('photoNames') as string[]
  const photoInputs = []

  for (let i = 0; i < photoFiles.length; i++) {
    if (photoFiles[i].size > 0) {
      const buffer = Buffer.from(await photoFiles[i].arrayBuffer())
      photoInputs.push({
        buffer,
        filename: photoFiles[i].name,
        mimeType: photoFiles[i].type,
        name: photoNames[i] || undefined,
      })
    }
  }

  const location = await createLocation(raw, {
    photoInput: photoInputs.length > 0 ? photoInputs : undefined,
  })

  revalidatePath('/locations')
  redirect(`/locations/${location.id}`)
}

// ─── Update ─────────────────────────────────────────────────

export async function updateLocationAction(id: string, formData: FormData) {
  const data: Record<string, unknown> = {}

  const fields = ['name', 'address', 'city', 'province', 'postalCode', 'country', 'notes', 'contactName', 'contactPhone', 'contactEmail']
  for (const field of fields) {
    const val = formData.get(field) as string
    if (val !== null && val !== undefined) {
      data[field] = val || undefined
    }
  }

  const keywordsStr = formData.get('keywords') as string
  if (keywordsStr !== null) {
    data.keywords = keywordsStr.split(',').map((k) => k.trim()).filter(Boolean)
  }

  await updateLocation(id, data)

  revalidatePath('/locations')
  revalidatePath(`/locations/${id}`)
  redirect(`/locations/${id}`)
}

// ─── Status ─────────────────────────────────────────────────

export async function updateLocationStatusAction(id: string, status: 'ACTIVE' | 'ARCHIVED' | 'DELETED') {
  if (status === 'DELETED') {
    await deleteLocationById(id)
  } else {
    await updateLocation(id, { status, deletedAt: null })
  }

  revalidatePath('/locations')
  if (status === 'DELETED') redirect('/locations')
  revalidatePath(`/locations/${id}`)
}
// ─── Photos ─────────────────────────────────────────────────

export async function addPhotosAction(locationId: string, formData: FormData) {
  const photoFiles = formData.getAll('photos') as File[]
  const photoNames = formData.getAll('photoNames') as string[]
  const photoInputs = []

  for (let i = 0; i < photoFiles.length; i++) {
    if (photoFiles[i].size > 0) {
      const buffer = Buffer.from(await photoFiles[i].arrayBuffer())
      photoInputs.push({
        buffer,
        filename: photoFiles[i].name,
        mimeType: photoFiles[i].type,
        name: photoNames[i] || undefined,
      })
    }
  }

  if (photoInputs.length > 0) {
    await addPhotosToLocation(locationId, photoInputs)
  }

  revalidatePath(`/locations/${locationId}`)
}

export async function deletePhotoAction(photoId: string, locationId: string) {
  await removePhotosFromLocation(locationId, [photoId])
  revalidatePath(`/locations/${locationId}`)
}

export async function updatePhotoNameAction(photoId: string, name: string, locationId: string) {
  await updatePhoto(photoId, { name })
  revalidatePath(`/locations/${locationId}`)
}

export async function updatePhotoDisplayOrderAction(locationId: string, orderedPhotoIds: string[]) {
  await updatePhotoDisplayOrder(locationId, orderedPhotoIds)
  revalidatePath(`/locations/${locationId}`)
}
