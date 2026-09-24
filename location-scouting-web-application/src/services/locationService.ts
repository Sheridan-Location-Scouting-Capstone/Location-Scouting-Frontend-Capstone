import { prisma as defaultPrisma} from '@/lib/prisma'
import {$Enums, Location, Prisma, PrismaClient} from "@prisma/client";
import {CreateLocationScheme, UpdateLocationScheme} from "@/schemas/locationSchema";
import {Geocoder} from "@/schemas/geocoder";
import {PhotoUploadInput} from "@/schemas/photoUploadInput";
import { uploadPhotos, defaultBucket } from "@/services/photoService";
import LocationStatus = $Enums.LocationStatus;
import {addPhotosToLocation, removePhotosFromLocation} from "@/services/locationPhotoService";
import {AppError} from "@/server/errors";
import { z } from 'zod';
import { Result } from '@/schemas/result';

export const defaultGeocoder: Geocoder = async (address: string) => {
    const encoded = encodeURIComponent(address)
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
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
        return { success: false, code: 'LIMIT_EXCEEDED', error: 'Maximum 500 photos per location' }
    }

    const parsed = CreateLocationScheme.safeParse(input)
    if (!parsed.success) {
        return {
            success: false,
            code: 'VALIDATION_FAILED',
            error: 'Invalid Input. Please fix the highlighted fields and try again.',
            fieldErrors: z.flattenError(parsed.error).fieldErrors
        }
    }

    if (parsed.data.contactPhone) {
        parsed.data.contactPhone = parsed.data.contactPhone.replace(/[\s()-]/g, '')
    }
    const address = `${parsed.data.address}, ${parsed.data.city}, ${parsed.data.province}, ${parsed.data.postalCode}, ${parsed.data.country}`

    let location
    try {
        location = await db.location.create({data: { ...parsed.data, userId }})
    } catch (error) {
        if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, code: 'ALREADY_EXISTS', error: 'Location already exists' }
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
        await addPhotosToLocation(location.id, photoInput, { db, bucket })
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
        return { success: false, code: 'NOT_FOUND', error: 'Location not found' }
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

export async function updateLocation(userId: string, id: string, data: Prisma.LocationUpdateInput, options?: { db?: PrismaClient, geocoder?: Geocoder }) {
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder

    const validated = UpdateLocationScheme.parse(data)

    const address = `${validated.address}, ${validated.city}, ${validated.province}, ${validated.postalCode}, ${validated.country}`

    const updatedLocation = await db.location.update({ where: { id, userId },  data: validated });

    geocoder(address)
        .then(async coords => {
            if (coords) {
                console.log(coords)
                await db.location.update({
                    where: { id: id},
                    data: { latitude: coords.lat, longitude: coords.lng }
                })
            }
        }) // If geocoding fails, set the values to null in order to avoid old address being valid, and pointing to the wrong area on a map
        .catch(async() => {
            try {
                await db.location.update({
                    where: {id: id},
                    data: {latitude: null, longitude: null}
                })
            } catch (error){
                console.log(error)
            }
        })

    return updatedLocation;
}

export async function deleteLocationById(userId: string, id: string, options?: { db?: PrismaClient }) {
    const db = options?.db ?? defaultPrisma
    await db.location.updateMany({
        where: { id, userId, deletedAt: null },
        data: {
            status: LocationStatus.DELETED,
            deletedAt: new Date()
        }
    })
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
