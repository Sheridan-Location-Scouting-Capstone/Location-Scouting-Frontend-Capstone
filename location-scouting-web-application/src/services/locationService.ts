import { prisma as defaultPrisma} from '@/lib/prisma'
import {$Enums, Location, Prisma, PrismaClient} from "@prisma/client";
import {CreateLocationScheme, UpdateLocationScheme} from "@/schemas/locationSchema";
import {Geocoder} from "@/schemas/geocoder";
import {defaultGeocoder} from "@/services/geocodingService";
import {PhotoUploadInput} from "@/schemas/photoUploadInput";
import { defaultBucket } from "@/services/photoService";
import LocationStatus = $Enums.LocationStatus;
import {addPhotosToLocation} from "@/services/locationPhotoService";
import { z } from 'zod';
import {ErrorCode, fail, ok, Result} from '@/schemas/result';
import {createLogger} from "@/lib/logger";
import {guard, isRecordNotFound, isUniqueViolation} from "@/services/serviceResult";

const logger = createLogger('locationService')

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
        return fail(ErrorCode.LIMIT_EXCEEDED, 'Maximum 500 photos per location')
    }

    const parsed = CreateLocationScheme.safeParse(input)
    if (!parsed.success) {
        return fail(
            ErrorCode.VALIDATION_FAILED,
            'Invalid Input. Please fix the highlighted fields and try again.',
            z.flattenError(parsed.error).fieldErrors
        )
    }

    if (parsed.data.contactPhone) {
        parsed.data.contactPhone = normalizePhone(parsed.data.contactPhone)
    }
    const address = `${parsed.data.address}, ${parsed.data.city}, ${parsed.data.province}, ${parsed.data.postalCode}, ${parsed.data.country}`

    return guard(logger, 'create location', async () => {
        let location : Location
        try {
            location = await db.location.create({data: { ...parsed.data, userId }})
        } catch (error) {
            if (isUniqueViolation(error)) {
                return fail(ErrorCode.ALREADY_EXISTS, 'Location already exists')
            }
            throw error
        }

        // Fire and forget. Potentially add a queue system here to retry failed lookups periodically or on a cron job
        geocoder(address)
            .then(async coords => {
                if (coords) {
                    await db.location.update({
                        where: { id: location.id},
                        data: { latitude: coords.lat, longitude: coords.lng }
                    })
                }
            })
            .catch((error) => logger.warn(`Failed to geocode location ${location.id}`, error))

        if(photoInput?.length) {
            const photos = await addPhotosToLocation(userId, location.id, photoInput, { db, bucket })
            if (!photos.success) {
                return fail(photos.code, `The location was saved, but its photos could not be uploaded: ${photos.error}`)
            }
        }

        return ok(location)
    })
}



export async function getLocationById(userId: string, id: string, options?: { db?: PrismaClient }) : Promise<Result<Location>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get location ${id}`, async () => {
        const location = await db.location.findFirst({
            where: { userId, id, status: { not: LocationStatus.DELETED } }
        })
        if (!location) {
            return fail(ErrorCode.NOT_FOUND, 'Location not found')
        }
        return ok(location)
    })
}

const withPhotos = {
    photos: { orderBy: { displayOrder: 'asc' } }
} satisfies Prisma.LocationInclude

export type LocationWithPhotos = Prisma.LocationGetPayload<{ include: typeof withPhotos }>

export async function getLocationWithPhotos(
    userId: string,
    id: string,
    options?: { db?: PrismaClient }
): Promise<Result<LocationWithPhotos>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get location ${id}`, async () => {
        const location = await db.location.findFirst({
            where: { id, userId, status: { not: LocationStatus.DELETED }},
            include: withPhotos
        })
        if (!location) {
            return fail(ErrorCode.NOT_FOUND, 'Location not found')
        }
        return ok(location)
    })
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
        return fail(ErrorCode.VALIDATION_FAILED, 'Invalid location data', z.flattenError(validated.error).fieldErrors)
    }

    const updates = validated.data
    if (updates.contactPhone) {
        updates.contactPhone = normalizePhone(updates.contactPhone)
    }

    return guard(logger, `update location ${id}`, async () => {
        let updatedLocation: Location
        try {
            updatedLocation = await db.location.update({ where: { id, userId },  data: updates });
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, 'Location not found')
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
                    await db.location.update({
                        where: { id },
                        data: { latitude: null, longitude: null }
                    }).catch((error) => logger.error(`Failed to clear coordinates for location ${id}`, error))
                })
        }

        return ok(updatedLocation)
    })
}

export async function deleteLocationById(userId: string, id: string, options?: { db?: PrismaClient }) : Promise<Result<void>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `delete location ${id}`, async () => {
        const { count } = await db.location.updateMany({
            where: { id, userId, deletedAt: null },
            data: {
                status: LocationStatus.DELETED,
                deletedAt: new Date()
            }
        })

        if (count === 0) {
            return fail(ErrorCode.NOT_FOUND, 'Location not found or already deleted')
        }
        return ok(undefined)
    })
}

const withCoverPhoto = {
    photos: { orderBy: { displayOrder: 'asc' }, take: 1 }
} satisfies Prisma.LocationInclude

export type LocationWithCoverPhoto = Prisma.LocationGetPayload<{ include: typeof withCoverPhoto }>

export async function getLocations(
    userId: string,
    options?: {
        db?: PrismaClient
        query?: string
        keywords?: string[]
    }
): Promise<Result<LocationWithCoverPhoto[]>> {
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

    return guard(logger, 'get locations', async () => ok(await db.location.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: withCoverPhoto
    })))
}
