// Driving distance and time from one origin (the studio) to many destinations (candidate locations).
//
// Self-hosted OSRM is the primary source (LS-303 dev, LS-304 prod). When OSRM isn't configured, is slow, unreachable,
// or answers with an error, every destination falls back to the detour-index estimate: the straight-line (Haversine)
// distance times a detour multiplier, with the time from an average speed. Routing never throws; the fallback reason
// is logged.
//
// Configuration (.env):
//   OSRM_URL  Base URL of the OSRM server, e.g. http://localhost:5000. Leave unset to always use the estimate.
//
// Everything OSRM-specific (the table URL, lon,lat order, waypoint snap distances) stays inside this file. Callers only
// see Coordinate and RouteResult.

import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { Coordinate, RouteResult, RoutingService } from '@/schemas/routing'
import { haversineDistance } from '@/services/scoringService'

const logger = createLogger('routingService')

export const ROUTING_DEFAULTS = {
    /** Give up on OSRM and use the estimate after this long */
    timeoutMs: 2_000,
    /** A point OSRM had to move further than this to reach a road has no usable route */
    maxSnapDistanceM: 1_000,
    /** Road distance ≈ straight-line distance × this. Typical detour indices for road networks are 1.2–1.4 */
    detourIndex: 1.35,
    /** Average driving speed assumed by the estimate, mixing city streets and highways */
    averageSpeedKmh: 40,
}

export type RoutingConfig = typeof ROUTING_DEFAULTS & { osrmUrl: string | undefined }

export function routingConfig(env: Record<string, string | undefined> = process.env): RoutingConfig {
    return {
        ...ROUTING_DEFAULTS,
        osrmUrl: env.OSRM_URL ? env.OSRM_URL.replace(/\/+$/, '') : undefined,
    }
}

// ------ Detour-index estimate ------------------------

export function estimateDrivingDistance(haversineKm: number, options?: { multiplier?: number }): number {
    return haversineKm * (options?.multiplier ?? ROUTING_DEFAULTS.detourIndex)
}

export function estimateDrivingTime(drivingDistanceKm: number, averageSpeedKmh: number = ROUTING_DEFAULTS.averageSpeedKmh): number {
    return (drivingDistanceKm / averageSpeedKmh) * 60
}

export function estimateRoute(origin: Coordinate, destination: Coordinate, config: RoutingConfig = routingConfig()): RouteResult {
    const straightLineKm = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng)
    const distanceKm = estimateDrivingDistance(straightLineKm, { multiplier: config.detourIndex })
    return { distanceKm, durationMin: estimateDrivingTime(distanceKm, config.averageSpeedKmh), estimated: true }
}

// ------ OSRM table adapter ---------------------------

const waypointSchema = z.object({ distance: z.number() })

const tableResponseSchema = z.object({
    code: z.literal('Ok'),
    durations: z.array(z.array(z.number().nullable())).min(1),
    distances: z.array(z.array(z.number().nullable())).min(1),
    sources: z.array(waypointSchema).min(1),
    destinations: z.array(waypointSchema),
})

type TableResponse = z.infer<typeof tableResponseSchema>

/** OSRM takes lon,lat — the reverse of everywhere else in the app */
function toOsrmCoordinate({ lat, lng }: Coordinate) {
    return `${lng},${lat}`
}

export function osrmTableUrl(baseUrl: string, origin: Coordinate, destinations: Coordinate[]) {
    const coordinates = [origin, ...destinations].map(toOsrmCoordinate).join(';')
    return `${baseUrl}/table/v1/driving/${coordinates}?sources=0&annotations=duration,distance&generate_hints=false`
}

/**
 * Maps a table response to one result per destination. Without a destinations parameter OSRM treats every
 * coordinate as a destination, so destination i is column i + 1 (column 0 is the origin itself).
 */
export function routesFromTable(table: TableResponse, destinationCount: number, maxSnapDistanceM: number): RouteResult[] {
    if (table.sources[0].distance > maxSnapDistanceM) {
        return Array(destinationCount).fill(null)
    }

    return Array.from({ length: destinationCount }, (_, i) => {
        const column = i + 1
        const waypoint = table.destinations[column]
        const seconds = table.durations[0][column]
        const metres = table.distances[0][column]

        if (!waypoint || waypoint.distance > maxSnapDistanceM) return null
        if (seconds == null || metres == null) return null
        return { durationMin: seconds / 60, distanceKm: metres / 1000, estimated: false }
    })
}

/** OSRM's routes, or the reason it couldn't be used */
async function fetchOsrmRoutes(
    config: RoutingConfig,
    fetchImpl: typeof fetch,
    origin: Coordinate,
    destinations: Coordinate[],
): Promise<{ routes: RouteResult[] } | { reason: string }> {
    if (!config.osrmUrl) return { reason: 'OSRM_URL is not set' }

    let body: unknown
    try {
        const response = await fetchImpl(osrmTableUrl(config.osrmUrl, origin, destinations), {
            signal: AbortSignal.timeout(config.timeoutMs),
        })
        body = await response.json()
    } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') return { reason: `timed out after ${config.timeoutMs} ms` }
        return { reason: `request failed: ${error instanceof Error ? error.message : 'unknown error'}` }
    }

    const code = (body as { code?: unknown } | null)?.code
    if (code !== 'Ok') return { reason: `responded with code ${String(code)}` }

    const table = tableResponseSchema.safeParse(body)
    if (!table.success) return { reason: 'returned a malformed table response' }

    return { routes: routesFromTable(table.data, destinations.length, config.maxSnapDistanceM) }
}

export function createRoutingService(options?: { config?: RoutingConfig; fetch?: typeof fetch }): RoutingService {
    return {
        async oneToMany(origin, destinations) {
            const config = options?.config ?? routingConfig()
            const fetchImpl = options?.fetch ?? globalThis.fetch
            if (destinations.length === 0) return []

            const osrm = await fetchOsrmRoutes(config, fetchImpl, origin, destinations)
            if ('routes' in osrm) return osrm.routes

            logger.warn(`OSRM unavailable (${osrm.reason}); using detour-index estimates`)
            return destinations.map((destination) => estimateRoute(origin, destination, config))
        },
    }
}

/** Reads the configuration on each call so changes to the environment (e.g. in tests) take effect */
export const routingService: RoutingService = createRoutingService()
