import { prisma as defaultPrisma} from '@/app/lib/prisma'
import {Location, Prisma, PrismaClient } from "@prisma/client";
import {CreateLocationScheme} from "@/app/schemas/locationSchema";
import {Geocoder} from "@/app/schemas/geocoder";

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
    db: PrismaClient = defaultPrisma,
    geocoder: Geocoder = defaultGeocoder
) {
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

    return location
}
