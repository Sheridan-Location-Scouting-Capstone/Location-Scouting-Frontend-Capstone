import {createLogger} from "@/lib/logger";
import {ErrorCode, Result, fail} from "@/schemas/result";
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

export async function getNearestSelectedDistance(userId: string, candidateId: string, productionId: string, options? : { db?: typeof defaultPrisma }): Promise<Result<{ nearestDistance: number | null }>> {
    const db = options?.db || defaultPrisma;
    return guard(logger, `get nearest selected distance for candidate ${candidateId}`, async () => {
        const candidate = await db.candidate.findUnique({
            where: { id: candidateId, scene: { project: { userId } } },
            select: {
                locationId: true,
                location: { select: { latitude: true, longitude: true } },
                scene: { select: { projectId: true } },
            },
        });

        if(!candidate) {
            return fail(ErrorCode.NOT_FOUND, 'Candidate not found');
        }

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



        const { latitude: lat1, longitude: lon1 } = candidate.location;
        if(lat1 === null || lon1 === null) {
            return fail(ErrorCode.VALIDATION_FAILED, 'Candidate location does not have valid coordinates');
        }


    }
}