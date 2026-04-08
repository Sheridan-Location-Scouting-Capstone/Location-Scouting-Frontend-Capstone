
export const DEFAULT_HISTORICAL_THRESHOLD: number = 5
export const DEFAULT_MAX_DISTANCE_KM = 100
export const DEFAULT_MIN_DISTANCE_KM = 0.3
export const MAX_PROXIMITY_SCORE = 1.0
export const MIN_PROXIMITY_SCORE = 0
export const DEFAULT_PHOTO_THRESHOLD = 25 // based on average number of photos in real estate listings

const WEIGHTS = {
    keyword: 0.5,
    proximity: 0.2,
    historical: 0.2,
    photo: 0.1,
}


// ------ Scoring Functions ----------------------------

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

export function proximityScore(lat1: number, lng1: number, lat2: number, lng2: number, maxDistance?: number) {
    const distance = haversineDistance(lat1, lng1, lat2, lng2);
    const distanceThreshold = maxDistance ?? DEFAULT_MAX_DISTANCE_KM;
    return calculateProximityScore(distance, maxDistance);
}

export function historicalScore(candidateCount: number, threshold?: number) : number {
    const inputThreshold = threshold || DEFAULT_HISTORICAL_THRESHOLD

    if(candidateCount < 0) return 0;
    if(candidateCount > inputThreshold) return 1;

    return Math.min(1, Math.log(candidateCount + 1) / Math.log(inputThreshold + 1))
}

export function photoCoverageScore(photoCount : number,threshold?: number) : number {
    const inputThreshold = threshold || DEFAULT_PHOTO_THRESHOLD

    if (photoCount < 0) return 0;
    if(photoCount > inputThreshold) return 1;

    return Math.min(1, Math.pow(photoCount / inputThreshold, 2))
}

export function jaccardSimilarity(a: string[], b: string[]): number {
    const setA = new Set(a)
    const setB = new Set(b)

    const intersection = new Set([...setA].filter(x => setB.has(x)))
    const union = new Set([...setA, ...setB])

    if (union.size === 0) return 0

    return intersection.size / union.size
}

export function scoreLocation(
    sceneKeywords: string[],
    locationKeywords: string[],
    projectCoords: { lat: number; lng: number } | null,
    locationCoords: { lat: number; lng: number } | null,
    candidateCount: number,
    photoCount: number,
): number {
    const keyword = jaccardSimilarity(sceneKeywords, locationKeywords)

    const proximity = projectCoords && locationCoords
        ? proximityScore(projectCoords.lat, projectCoords.lng, locationCoords.lat, locationCoords.lng)
        : 0

    const historical = historicalScore(candidateCount)
    const photo = photoCoverageScore(photoCount)

    return (
        keyword   * WEIGHTS.keyword +
        proximity * WEIGHTS.proximity +
        historical * WEIGHTS.historical +
        photo     * WEIGHTS.photo
    )
}