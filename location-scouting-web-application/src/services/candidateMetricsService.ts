import {createLogger} from "@/lib/logger";
import {ErrorCode, Result} from "@/schemas/result";
import { prisma as defaultPrisma } from '@/lib/prisma'
import {guard} from "@/services/serviceResult";

const logger = createLogger('candidateMetricsService')

export async function getKeywordOverlap(userId: string, candidateId: string, options?: { db?: typeof defaultPrisma }): Promise<Result<{ matchedKeywords: string[]; sceneKeywords: string[] }>> {
    const db = options?.db || defaultPrisma;
    return guard(logger, `get keyword overlap for candidate ${candidateId}`, async () => {
        const candidate = await db.candidate.findUnique({
            where: { id: candidateId, scene: { project: { userId } } },
            include: {
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