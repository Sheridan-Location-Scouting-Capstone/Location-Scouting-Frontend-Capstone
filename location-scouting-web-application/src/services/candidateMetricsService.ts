import {createLogger} from "@/lib/logger";
import {ErrorCode, Result, fail, ok} from "@/schemas/result";
import {Coordinate, RoutingService} from "@/schemas/routing";
import { prisma as defaultPrisma } from '@/lib/prisma'
import {guard} from "@/services/serviceResult";

const logger = createLogger('candidateMetricsService')

export async function getKeywordOverlap(userId: string, candidateId: string, options?: { db?: typeof defaultPrisma }): Promise<Result<{ matchedKeywords: string[]; sceneKeywords: string[] }>> {
    const db = options?.db || defaultPrisma;
    return guard(logger, `get keyword overlap for candidate ${candidateId}`, async () => {
        const candidate = await db.candidate.findUnique({
            where: { id: candidateId, scene: { project: { userId } } },
            select: {
                location: { select: { keywords: true } },
                scene: { select: { keywords: true } },
            }
        });

        if (!candidate) {
            return { success: false, code: ErrorCode.NOT_FOUND, error: 'Candidate not found' };
        }

        const locationKeys = new Set(candidate.location.keywords.map(k => k.toLowerCase()));
        const matchedKeywords = candidate.scene.keywords.filter(k => locationKeys.has(k.toLowerCase()));

        return { success: true, data: { matchedKeywords, sceneKeywords: candidate.scene.keywords } };
    })
}

export type NearestSelectedDistance = {
    nearestLocationId: string
    locationName: string
    distanceKm: number
    durationMin: number | null
    estimated: boolean
}

/**
 * Driving distance from a candidate to the nearest location locked (selected) in any scene of the candidate's
 * production. The production comes from the candidate's scene. data is null when there is nothing to measure: the
 * candidate has no coordinates, nothing else is locked, or no locked location could be routed to.
 */
export async function getNearestSelectedDistance(userId: string, candidateId: string, options?: { db?: typeof defaultPrisma, router?: RoutingService }): Promise<Result<NearestSelectedDistance | null>> {
    const db = options?.db || defaultPrisma;
    return guard(logger, `get nearest selected distance for candidate ${candidateId}`, async () => {
        // No default router on this branch yet: LS-306 adds the OSRM-backed routingService
        const router = options?.router;
        if (!router) {
            throw new Error('getNearestSelectedDistance needs a routing service: pass options.router');
        }

        const candidate = await db.candidate.findUnique({
            where: { id: candidateId, scene: { project: { userId } } },
            select: {
                locationId: true,
                location: { select: { latitude: true, longitude: true } },
                scene: { select: { projectId: true } },
            },
        });

        if (!candidate) {
            return fail(ErrorCode.NOT_FOUND, 'Candidate not found');
        }

        const origin = toCoordinate(candidate.location.latitude, candidate.location.longitude);
        if (!origin) {
            return ok(null);
        }

        // Ownership carries over: projectId came from a candidate the user was verified to own
        const locked = await db.candidate.findMany({
            where: {
                selected: true,
                scene: { projectId: candidate.scene.projectId },
                locationId: { not: candidate.locationId },
                location: { latitude: { not: null }, longitude: { not: null } },
            },
            distinct: ['locationId'],
            select: { location: { select: { id: true, name: true, latitude: true, longitude: true } } },
        });

        const destinations = locked.flatMap(({ location }) => {
            const coordinate = toCoordinate(location.latitude, location.longitude);
            return coordinate ? [{ id: location.id, name: location.name, coordinate }] : [];
        });

        if (destinations.length === 0) {
            return ok(null);
        }

        const routes = await router.oneToMany(origin, destinations.map(d => d.coordinate));

        const routed = destinations.flatMap((destination, index) => {
            const route = routes[index];
            return route ? [{ ...destination, route }] : [];
        });

        // Real routes carry a duration; distance-only estimates don't, so rank by time when we have it
        const timed = routed.filter(r => r.route.durationMin !== null);
        const nearest = timed.length > 0
            ? minBy(timed, r => r.route.durationMin!)
            : minBy(routed, r => r.route.distanceKm);

        if (!nearest) {
            return ok(null);
        }

        return ok({
            nearestLocationId: nearest.id,
            locationName: nearest.name,
            distanceKm: nearest.route.distanceKm,
            durationMin: nearest.route.durationMin,
            estimated: nearest.route.estimated,
        });
    })
}

function toCoordinate(lat: number | null, lng: number | null): Coordinate | null {
    return lat === null || lng === null ? null : { lat, lng };
}

function minBy<T>(items: T[], value: (item: T) => number): T | undefined {
    return items.reduce<T | undefined>((min, item) => (min === undefined || value(item) < value(min) ? item : min), undefined);
}
