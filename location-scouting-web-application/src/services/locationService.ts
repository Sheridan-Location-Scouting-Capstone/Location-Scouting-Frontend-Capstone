import { prisma as defaultPrisma} from '@/lib/prisma'
import {$Enums, Location, Prisma, PrismaClient} from "@prisma/client";
import {CreateLocationScheme, UpdateLocationScheme} from "@/schemas/locationSchema";
import {Geocoder} from "@/schemas/geocoder";
import {PhotoUploadInput} from "@/schemas/photoUploadInput";
import { defaultBucket } from "@/services/photoService";
import LocationStatus = $Enums.LocationStatus;
import {addPhotosToLocation} from "@/services/locationPhotoService";
import { z } from 'zod';
import {ErrorCode, Result} from '@/schemas/result';

const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

// NOMINATIM_API_URL (.env) points geocoding at a mock server instead of OpenStreetMap; see mocks/README.md
export const defaultGeocoder: Geocoder = async (address: string) => {
    const encoded = encodeURIComponent(address)
    const baseUrl = (process.env.NOMINATIM_API_URL || DEFAULT_NOMINATIM_URL).replace(/\/+$/, '')
    const res = await fetch(
        `${baseUrl}/search?q=${encoded}&format=json&limit=1`,
        { headers: { 'User-Agent': 'location-scouting-app/1.0' } }
    )
    const data = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}


export async function createLocation(
    userId: string,
    input: z.input<typeof CreateLocationScheme>,
    options?: {
        db?: PrismaClient
        geocoder?: Geocoder
        photoInput?: PhotoUploadInput[]
        bucket?: string
    }
): Promise<Result<Location>> {
    // Default settings
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder
    const photoInput = options?.photoInput
    const bucket = options?.bucket ?? defaultBucket

    if (options?.photoInput && options.photoInput.length > 500) {
        return { success: false, code: ErrorCode.LIMIT_EXCEEDED, error: 'Maximum 500 photos per location' }
    }

    const parsed = CreateLocationScheme.safeParse(input)
    if (!parsed.success) {
        return {
            success: false,
            code: ErrorCode.VALIDATION_FAILED,
            error: 'Invalid Input. Please fix the highlighted fields and try again.',
            fieldErrors: z.flattenError(parsed.error).fieldErrors
        }
    }

    if (parsed.data.contactPhone) {
        parsed.data.contactPhone = normalizePhone(parsed.data.contactPhone)
    }
    const address = `${parsed.data.address}, ${parsed.data.city}, ${parsed.data.province}, ${parsed.data.postalCode}, ${parsed.data.country}`

    let location : Location
    try {
        location = await db.location.create({data: { ...parsed.data, userId }})
    } catch (error) {
        if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, code: ErrorCode.ALREADY_EXISTS, error: 'Location already exists' }
        }
        throw error
    }

    geocoder(address)
        .then(async coords => {
            if (coords) {
                await db.location.update({
                    where: { id: location.id},
                    data: { latitude: coords.lat, longitude: coords.lng }
                })
            }
        })
        .catch(() => {}) // swallow geocoding errors silently. Potentially add a queue system here to retry periodically or on a cron job

    if(photoInput?.length) {
        await addPhotosToLocation(userId, location.id, photoInput, { db, bucket })
    }

    return { success: true, data: location }
}



export async function getLocationById(userId: string, id: string, options?: { db?: PrismaClient }) : Promise<Result<Location>> {
    const db = options?.db ?? defaultPrisma
    const location = await db.location
        .findFirst(
            { where:
                    {
                        userId,
                        id,
                        status: { not: LocationStatus.DELETED}
                    }
            });
    if (!location) {
        return { success: false, code: ErrorCode.NOT_FOUND, error: 'Location not found' }
    }
    return { success: true, data: location }
}

export async function getLocationWithPhotos(userId: string, id: string, options?: { db?: PrismaClient }) {
    const db = options?.db ?? defaultPrisma
    return db.location.findFirst({
        where: { id, userId, status: { not: LocationStatus.DELETED }},
        include: { photos: { orderBy: { displayOrder: 'asc' }}}
    });
}

const ADDRESS_FIELDS = ['address', 'city', 'province', 'postalCode', 'country'] as const

function normalizePhone(phone: string) {
    return phone.replace(/[\s()-]/g, '')
}

function formatGeocodingAddress(location: Pick<Location, typeof ADDRESS_FIELDS[number]>) {
    return `${location.address}, ${location.city}, ${location.province}, ${location.postalCode}, ${location.country}`
}

export async function updateLocation(
    userId: string,
    id: string,
    data: z.input<typeof UpdateLocationScheme>,
    options?: { db?: PrismaClient, geocoder?: Geocoder }
) : Promise<Result<Location>> {
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder

    const validated = UpdateLocationScheme.safeParse(data)

    if (!validated.success) {
        return {
            success: false,
            code: ErrorCode.VALIDATION_FAILED,
            error: 'Invalid location data',
            fieldErrors: z.flattenError(validated.error).fieldErrors
        }
    }

    const updates = validated.data
    if (updates.contactPhone) {
        updates.contactPhone = normalizePhone(updates.contactPhone)
    }

    let updatedLocation: Location
    try {
        updatedLocation = await db.location.update({ where: { id, userId },  data: updates });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, code: ErrorCode.NOT_FOUND, error: 'Location not found' }
        }
        throw error
    }

    // Only re-geocode when the address changed, and always from the full saved address
    const addressChanged = ADDRESS_FIELDS.some(field => updates[field] !== undefined)
    if (addressChanged) {
        geocoder(formatGeocodingAddress(updatedLocation))
            .then(async coords => {
                if (coords) {
                    await db.location.update({
                        where: { id },
                        data: { latitude: coords.lat, longitude: coords.lng }
                    })
                }
            })
            // If geocoding fails, clear the coordinates so the old address doesn't keep pointing at the wrong place on a map
            .catch(async () => {
                try {
                    await db.location.update({
                        where: { id },
                        data: { latitude: null, longitude: null }
                    })
                } catch (error) {
                    console.error(error)
                }
            })
    }

    return { success: true, data: updatedLocation };
}

export async function deleteLocationById(userId: string, id: string, options?: { db?: PrismaClient }) : Promise<Result<void>> {
    const db = options?.db ?? defaultPrisma
    const { count } = await db.location.updateMany({
        where: { id, userId, deletedAt: null },
        data: {
            status: LocationStatus.DELETED,
            deletedAt: new Date()
        }
    })

    if (count === 0) {
        return { success: false, code: ErrorCode.NOT_FOUND, error: 'Location not found or already deleted' }
    }
    return { success: true, data: undefined };
}

export async function getLocations(
    userId: string,
    options?: {
        db?: PrismaClient
        query?: string
        keywords?: string[]
    }
) {
    const db = options?.db ?? defaultPrisma
    const where: Prisma.LocationWhereInput = {
        userId, status: { not: LocationStatus.DELETED }
    }

    if (options?.query) {
        where.OR = [
            { name: { contains: options.query, mode: 'insensitive' } },
            { address: { contains: options.query, mode: 'insensitive' } },
            { city: { contains: options.query, mode: 'insensitive' } },
        ]
    }
    if (options?.keywords && options.keywords.length > 0 ) {
        where.keywords = { hasSome: options.keywords }
    }

    return db.location.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            photos: {
                orderBy: { displayOrder: 'asc' },
                take: 1
            }
        }
    })
}
