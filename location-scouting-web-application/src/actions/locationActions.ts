'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createLocation,
  deleteLocationById,
  getLocationById,
  getLocations,
  getLocationWithPhotos,
  updateLocation,
} from '@/services/locationService'
import {
  addPhotosToLocation,
  removePhotosFromLocation, updatePhoto, updatePhotoDisplayOrder
} from '@/services/locationPhotoService'
import {requireUser} from "@/lib/auth-session";

const REQUIRED_LOCATION_FIELDS = ['name', 'address', 'city', 'province', 'postalCode'] as const
const OPTIONAL_LOCATION_FIELDS = ['notes', 'contactName', 'contactPhone', 'contactEmail'] as const

// ─── List / Search ──────────────────────────────────────────

export async function getLocationsAction(query?: string, keywords?: string[]) {
  const user = await requireUser()
  return getLocations(user.id, { query, keywords })
}

// ─── Single Location ────────────────────────────────────────

export async function getLocationAction(id: string) {
  const user = await requireUser()
  return await getLocationWithPhotos(user.id, id)
}

// ─── Create ─────────────────────────────────────────────────

export async function createLocationAction(formData: FormData) {
  const user = await requireUser()
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

  const result = await createLocation(user.id, raw, {
    photoInput: photoInputs.length > 0 ? photoInputs : undefined,
  })

  if(!result.success) return result

  revalidatePath('/locations')
  redirect(`/locations/${result.data.id}`)
}

// ─── Update ─────────────────────────────────────────────────

export async function updateLocationAction(id: string, formData: FormData) {
  const user = await requireUser()
  const data: Record<string, unknown> = {}

  // Required fields are sent as-is so clearing one fails validation instead of being silently ignored
  for (const field of REQUIRED_LOCATION_FIELDS) {
    const val = formData.get(field)
    if (typeof val === 'string') data[field] = val
  }
  // An empty country keeps the current value
  const country = formData.get('country')
  if (typeof country === 'string' && country) data.country = country
  // Optional fields are cleared with null when left empty
  for (const field of OPTIONAL_LOCATION_FIELDS) {
    const val = formData.get(field)
    if (typeof val === 'string') data[field] = val || null
  }

  const keywordsStr = formData.get('keywords') as string
  if (keywordsStr !== null) {
    data.keywords = keywordsStr.split(',').map((k) => k.trim()).filter(Boolean)
  }

  const result = await updateLocation(user.id, id, data)
  if (!result.success) return result

  revalidatePath('/locations')
  revalidatePath(`/locations/${id}`)
  redirect(`/locations/${id}`)
}

export async function removeKeywordAction(id: string, keyword: string) {
    const user = await requireUser()
    const locationResult = await getLocationById(user.id, id)
    if (!locationResult.success) return locationResult
    const updatedKeywords = locationResult.data.keywords.filter((k: string) => k !== keyword)

    const result = await updateLocation(user.id, id, { keywords: updatedKeywords })
    if (!result.success) return result

    revalidatePath('/locations')
    revalidatePath(`/locations/${id}`)
}

// ─── Status ─────────────────────────────────────────────────

export async function updateLocationStatusAction(id: string, status: 'ACTIVE' | 'ARCHIVED' | 'DELETED') {
  const user = await requireUser()
  const result = status === 'DELETED'
    ? await deleteLocationById(user.id, id)
    : await updateLocation(user.id, id, { status, deletedAt: null })
  if (!result.success) return result

  revalidatePath('/locations')
  if (status === 'DELETED') redirect('/locations')
  revalidatePath(`/locations/${id}`)
}
// ─── Photos ─────────────────────────────────────────────────

export async function addPhotosAction(locationId: string, formData: FormData) {
  const user = await requireUser()
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
    const result = await addPhotosToLocation(user.id, locationId, photoInputs)
    if (!result.success) return result
  }

  revalidatePath(`/locations/${locationId}`)
}

export async function deletePhotoAction(photoId: string, locationId: string) {
  const user = await requireUser()
  const result = await removePhotosFromLocation(user.id, locationId, [photoId])
  if (!result.success) return result
  revalidatePath(`/locations/${locationId}`)
}

export async function updatePhotoNameAction(photoId: string, name: string, locationId: string) {
  const user = await requireUser()
  const result = await updatePhoto(user.id, photoId, { name })
  if (!result.success) return result
  revalidatePath(`/locations/${locationId}`)
}

export async function updatePhotoDisplayOrderAction(locationId: string, orderedPhotoIds: string[]) {
  const user = await requireUser()
  const result = await updatePhotoDisplayOrder(user.id, locationId, orderedPhotoIds)
  if (!result.success) return result
  revalidatePath(`/locations/${locationId}`)
}
