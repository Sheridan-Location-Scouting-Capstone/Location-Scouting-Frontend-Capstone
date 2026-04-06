import {Result} from "@/app/schemas/result";
import {Candidate, Prisma} from "@prisma/client";
import { prisma as defaultPrisma } from '@/app/lib/prisma'
import { z } from 'zod'
import CandidateCreateInput = Prisma.CandidateCreateInput
import {CreateCandidateSchema} from "@/app/schemas/candidateSchema"

const candidateInclude = {
    location: true,
    photos: { include: { photo: true } }
} satisfies Prisma.CandidateInclude

export type CandidateWithDetails = Prisma.CandidateGetPayload<{ include: typeof candidateInclude }>


export async function createCandidate(input: z.infer<typeof CreateCandidateSchema>, options?: { db?: typeof defaultPrisma }) : Promise<Result<Candidate>> {
    const db = options?.db ?? defaultPrisma

    const photoIds = input.photos ?? []

    try {
        const candidate = await db.candidate.create({
            data: {
                scene: {connect: {id: input.sceneId}},
                location: {connect: {id: input.locationId}},
                selected: input.selected ?? false,
                photos: {
                    create: photoIds.map((photoId, index) => ({
                        photo: {connect: {id: photoId}},
                        displayOrder: index,
                    }))
                }
            }
        })

        return {success: true, data: candidate}

    } catch (error) {
        if(error instanceof Prisma.PrismaClientKnownRequestError) {
            if(error.code === 'P2002') {
                console.log('Candidate already exists for this scene')
                return { success: false, error: 'Candidate already exists for this scene' }
            }
        }

        console.log(`Failed to create candidate with Scene ID: ${input.sceneId} and Location ID: ${input.locationId}`);
        return { success: false, error: "Failed to create candidate with Scene ID and Location ID" }
    }
}

export async function getCandidatesForScene(sceneId: string, options?: {db: typeof defaultPrisma}) : Promise<Result<CandidateWithDetails[]>> {
    const db = options?.db ?? defaultPrisma

    try {
        const candidates = await db.candidate.findMany({
            where: { sceneId: sceneId },
            include: candidateInclude
        })

        return { success: true, data: candidates }
    } catch (error) {
        console.log(`Failed to get all candidates for Scene: ${sceneId}`)
        return { success: false, error: `Failed to fetch candidates for scene: ${sceneId}`}
    }
}

export async function removeCandidateFromScene(candidateId: string, options?: {db: typeof defaultPrisma}) {
    const db = options?.db ?? defaultPrisma
    try {
        const result = await db.candidate.delete({
            where: { id : candidateId }
        })
        return {success: true, data: result }
    } catch (error) {
        console.log(`Error when deleting candidate: ${candidateId}`)
        return { success: false, error: `Failed to delete candidate: ${candidateId}` }
    }
}

export async function toggleCandidateSelected(candidateId: string, selected: boolean, options?: { db: typeof defaultPrisma}) {
    const db = options?.db ?? defaultPrisma

    try {
        const result = await db.candidate.update({
            where: {id: candidateId},
            data: {selected: selected}
        })
        return {success: true, data: result }
    } catch (error) {
        console.log(`Error when deleting candidate: ${candidateId}`)
        return { success: false, error: `Failed to update candidate: ${candidateId}` }
    }
}