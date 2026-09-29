import {ErrorCode, fail, ok, Result} from "@/schemas/result";
import {Candidate, LocationStatus, Photo, Prisma} from "@prisma/client";
import { prisma as defaultPrisma } from '@/lib/prisma'
import { z } from 'zod'
import {CreateCandidateSchema} from "@/schemas/candidateSchema"
import {createLogger} from "@/lib/logger";
import {guard, isRecordNotFound, isUniqueViolation} from "@/services/serviceResult";
import {PhotoWithUrl, withPhotoUrls} from "@/services/photoService";
import {ObjectStore} from "@/infrastructure/storage";

const logger = createLogger('candidateService')

export const HISTORICAL_THRESHOLD: number = 5

const candidateInclude = {
    location: true,
    photos: { include: { photo: true } }
} satisfies Prisma.CandidateInclude

type CandidateRow = Prisma.CandidateGetPayload<{ include: typeof candidateInclude }>
type CandidatePhotoRow = CandidateRow['photos'][number]

export type CandidateWithDetails = Omit<CandidateRow, 'photos'> & {
    photos: (Omit<CandidatePhotoRow, 'photo'> & { photo: PhotoWithUrl<Photo> })[]
}

// A candidate links a scene and a location, so the user must own both parents:
// the scene's project and the location.
const ownedBy = (userId: string) => ({
    location: { userId },
    scene: { project: { userId } }
}) satisfies Prisma.CandidateWhereInput


export async function createCandidate(
    userId: string,
    input: z.infer<typeof CreateCandidateSchema>,
    options?: { db?: typeof defaultPrisma }
) : Promise<Result<Candidate>> {
    const db = options?.db ?? defaultPrisma
    const photoIds = input.photos ?? []

    return guard(logger, 'create candidate', async () => {
        try {
            const candidate = await db.candidate.create({
                data: {
                    scene: { connect: { id: input.sceneId, project: { userId } } },
                    location: { connect: { id: input.locationId, userId, status: LocationStatus.ACTIVE } },
                    selected: input.selected ?? false,
                    photos: {
                        create: photoIds.map((photoId, index) => ({
                            photo: { connect: { id: photoId, locationId: input.locationId } },
                            displayOrder: index,
                        }))
                    }
                }
            })
            return ok(candidate)
        } catch (error) {
            if (isUniqueViolation(error)) {
                return fail(ErrorCode.ALREADY_EXISTS, 'Candidate already exists for this scene')
            }
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, 'Scene or Location not found for this candidate')
            }
            throw error
        }
    })
}

export async function getCandidatesForScene(
    userId: string,
    sceneId: string,
    options?: {db?: typeof defaultPrisma, objectStore?: ObjectStore}
) : Promise<Result<CandidateWithDetails[]>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get candidates for scene ${sceneId}`, async () => {
        const candidates = await db.candidate.findMany({
            where: { sceneId, ...ownedBy(userId) },
            include: candidateInclude
        })

        const photos = await withPhotoUrls(
            userId,
            candidates.flatMap(candidate => candidate.photos.map(candidatePhoto => candidatePhoto.photo)),
            { objectStore: options?.objectStore }
        )
        if (!photos.success) return photos
        const photoById = new Map(photos.data.map(photo => [photo.id, photo]))

        return ok(candidates.map(candidate => ({
            ...candidate,
            photos: candidate.photos.map(candidatePhoto => ({ ...candidatePhoto, photo: photoById.get(candidatePhoto.photoId)! }))
        })))
    })
}

export async function removeCandidateFromScene(
    userId: string,
    candidateId: string,
    options?: { db?: typeof defaultPrisma }
) : Promise<Result<void>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `delete candidate ${candidateId}`, async () => {
        try {
            await db.candidate.delete({ where: { id: candidateId, ...ownedBy(userId) } })
            return ok(undefined)
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, `Candidate not found or not authorized to delete: ${candidateId}`)
            }
            throw error
        }
    })
}

export async function toggleCandidateSelected(
    userId: string,
    candidateId: string,
    selected: boolean,
    options?: { db?: typeof defaultPrisma}
) : Promise<Result<Candidate>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `update candidate ${candidateId}`, async () => {
        try {
            const candidate = await db.candidate.update({
                where: { id: candidateId, ...ownedBy(userId) },
                data: { selected }
            })
            return ok(candidate)
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, `Candidate not found or not authorized to update: ${candidateId}`)
            }
            throw error
        }
    })
}

export async function getCandidateById(
    userId: string,
    candidateId: string,
    options?: { db?: typeof defaultPrisma }
): Promise<Result<Candidate>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get candidate ${candidateId}`, async () => {
        const candidate = await db.candidate.findUnique({ where: { id: candidateId, ...ownedBy(userId) } })
        if (!candidate) {
            return fail(ErrorCode.NOT_FOUND, `Candidate not found: ${candidateId}`)
        }
        return ok(candidate)
    })
}
//
// export async function getHistoricalScore(candidateId: string, options?: { db?: typeof defaultPrisma, historicalThreshold?: number }) : Promise<Result<number>> {
//     const db = options?.db ?? defaultPrisma
//     const threshold = options?.historicalThreshold ?? HISTORICAL_THRESHOLD
//     // 1. get the location id of the candidate
//     // 2. get all candidates with a shared location id and also selected
//     const locationIdResult = await db.candidate.findUnique({
//         where: {id: candidateId},
//         select: {locationId: true}
//     })
//
//     if (!locationIdResult) {
//         return {success: false, error: "Candidate not found"}
//     }
//     const count = await db.candidate.count({
//         where: {
//             locationId: locationIdResult.locationId,
//             selected: true
//         }
//     })
//
//     // 3. Calculate the score using a logarithmic normalized score, as being chosen more often has less significance
//     const historicalScore = Math.min(1, Math.log(count + 1) / Math.log(HISTORICAL_THRESHOLD + 1))
//     return { success: true, data: historicalScore }
//