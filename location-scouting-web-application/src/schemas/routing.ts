export type Coordinate = { lat: number; lng: number }

/**
 * Driving distance and time to one destination. null when no route could be found (e.g. the point is too far from
 * any road).
 *
 * estimated is true when the result comes from the detour-index fallback rather than a real road route. Estimates
 * carry a distance only: durationMin is null, because a time derived from an assumed average speed would just be the
 * distance in other units. Rank by durationMin when it's present and fall back to distanceKm when it's null.
 */
export type RouteResult = { durationMin: number | null; distanceKm: number; estimated: boolean } | null

export interface RoutingService {
    /** One result per destination, in the same order as destinations */
    oneToMany(origin: Coordinate, destinations: Coordinate[]): Promise<RouteResult[]>
}
