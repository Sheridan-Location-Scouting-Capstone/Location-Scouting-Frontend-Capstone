import { Geocoder } from '@/schemas/geocoder'

// Address geocoding with OpenStreetMap's Nominatim. Throws on network errors so callers decide how to handle them;
// resolves to null when the address can't be found.
//
// NOMINATIM_API_URL (.env) points geocoding at a mock server instead of OpenStreetMap; see mocks/README.md

const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

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
