export interface GeocodingService {
    geocode(address: String, city: string, province: string, postalCode: string, country: string): Promise<{lat: number; lng: number}>
}

