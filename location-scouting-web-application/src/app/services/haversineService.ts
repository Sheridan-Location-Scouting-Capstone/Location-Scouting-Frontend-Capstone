export const DEFAULT_MAX_DISTANCE_KM = 100
export const DEFAULT_MIN_DISTANCE_KM = 0.3
export const MAX_PROXIMITY_SCORE = 1.0
export const MIN_PROXIMITY_SCORE = 0

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) : number {
    // distance between lats and longs
    let dLat : number = (lat2 - lat1) * Math.PI / 180.0
    let dLon : number = (lng2 - lng1) * Math.PI / 180.0

    //convert to radiansa
    lat1 = (lat1) * Math.PI / 180.0
    lat2 = (lat2) * Math.PI / 180.0

    // apply formulae
    let a : number = Math.pow(Math.sin(dLat / 2), 2) +
                    Math.pow(Math.sin(dLon / 2), 2) *
                    Math.cos(lat1) *
                    Math.cos(lat2);
    let rad : number = 6371;
    let c : number = 2 * Math.asin(Math.sqrt(a))
    return rad * c;
}

export function calculateProximityScore(distance: number, maxDistance?: number) : number {
    maxDistance = maxDistance || DEFAULT_MAX_DISTANCE_KM;

    // outside the range? Clamp it
    if(distance < DEFAULT_MIN_DISTANCE_KM) return 1
    if(distance > DEFAULT_MAX_DISTANCE_KM) return 0


    return Math.round(((maxDistance - distance) / (maxDistance - DEFAULT_MIN_DISTANCE_KM)) * 100) / 100;
}