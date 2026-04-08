import { prisma as defaultPrisma} from '@/app/lib/prisma'
import {$Enums, Location, Prisma, PrismaClient} from "@prisma/client";
import {CreateLocationScheme, UpdateLocationScheme} from "@/app/schemas/locationSchema";
import {Geocoder} from "@/app/schemas/geocoder";
import {PhotoUploadInput} from "@/app/schemas/photoUploadInput";
import { uploadPhotos, defaultBucket } from "@/app/services/photoService";
import LocationStatus = $Enums.LocationStatus;
import {addPhotosToLocation, removePhotosFromLocation} from "@/app/services/locationPhotoService";

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
    input: Prisma.LocationCreateInput,
    options?: {
        db?: PrismaClient
        geocoder?: Geocoder
        photoInput?: PhotoUploadInput[]
        bucket?: string
    }
) {
    // Default settings
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder
    const photoInput = options?.photoInput
    const bucket = options?.bucket ?? defaultBucket

    if (options?.photoInput && options.photoInput.length > 500) {
        throw new RangeError('Photo upload limit exceeded: maximum 500 photos per location')
    }

    if (input.contactPhone) {
        input.contactPhone = input.contactPhone.replaceAll('-', '')
        input.contactPhone = input.contactPhone.replaceAll('(', '')
        input.contactPhone = input.contactPhone.replaceAll(')', '')
    }
    const validated = CreateLocationScheme.parse(input)
    const address = `${validated.address}, ${validated.city}, ${validated.province}, ${validated.postalCode}, ${validated.country}`

    const location = await db.location.create({ data: validated })

    geocoder(address)
        .then(async coords => {
            if (coords) {
                console.log(coords)
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

    return location
}



export async function getLocationById(id: string, options?: { db?: PrismaClient }) {
    const db = options?.db ?? defaultPrisma
    return db.location.findFirst({ where: { id, status: { not: LocationStatus.DELETED }}});
}

export async function getLocationWithPhotos(id: string, options?: { db?: PrismaClient }) {
    const db = options?.db ?? defaultPrisma
    return db.location.findFirst({
        where: { id, status: { not: LocationStatus.DELETED }},
        include: { photos: { orderBy: { displayOrder: 'asc' }}}
    });
}

export async function updateLocation(id: string, data: Prisma.LocationUpdateInput, options?: { db?: PrismaClient, geocoder?: Geocoder }) {
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder

    const validated = UpdateLocationScheme.parse(data)

    const address = `${validated.address}, ${validated.city}, ${validated.province}, ${validated.postalCode}, ${validated.country}`

    const updatedLocation = db.location.update({ where: { id },  data: validated });

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
            await db.location.update({
                where: { id: id},
                data: { latitude: null, longitude: null }
            })
        })

    return updatedLocation;
}

export async function deleteLocationById(id: string, options?: { db?: PrismaClient }) {
    const db = options?.db ?? defaultPrisma
    await db.location.update({
        where: { id },
        data: { status: LocationStatus.DELETED }
    })
}

export async function getLocations(
    options?: {
        db?: PrismaClient
        query?: string
        keywords?: string[]
    }
) {
    const db = options?.db ?? defaultPrisma
    const where: Prisma.LocationWhereInput = {
         status: { not: LocationStatus.DELETED }
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
