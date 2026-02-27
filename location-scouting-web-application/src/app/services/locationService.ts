import { prisma as defaultPrisma} from '@/app/lib/prisma'
import {Location, Prisma, PrismaClient } from "@prisma/client";
import {CreateLocationScheme} from "@/app/schemas/locationSchema";
import {Geocoder} from "@/app/schemas/geocoder";
import {PhotoUploadInput} from "@/app/schemas/photoUploadInput";
import { uploadPhotos, defaultBucket } from "@/app/services/photoService";

const defaultGeocoder: Geocoder = async (address: string) => {
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
        const uploadedPhotos = await uploadPhotos(photoInput, bucket)
        await db.photo.createMany({
            data: uploadedPhotos.map((result, index) => ({
                name: photoInput[index].filename,
                url: result.url,
                locationId: location.id,
                displayOrder: index
            }))
        })
    }

    return location
}



export async function getLocationById(id: string, options?: { db?: PrismaClient }) {
    const db = options?.db ?? defaultPrisma
    return db.location.findUnique({
        where: { id },
        include: { photos: { orderBy: { displayOrder: 'asc' }}}
    });
}
