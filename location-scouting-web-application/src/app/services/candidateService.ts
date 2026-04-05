import {Result} from "@/app/schemas/result";
import {Candidate, Prisma} from "@prisma/client";
import { prisma as defaultPrisma } from '@/app/lib/prisma'
import { z } from 'zod'
import CandidateCreateInput = Prisma.CandidateCreateInput
import {CreateCandidateSchema} from "@/app/schemas/candidateSchema"


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

        return { success: true, data: candidate}

    } catch (error) {
        console.log(`Failed to create candidate with Scene ID: ${input.sceneId} and Location ID: ${input.locationId}`);
        return { success: false, error: "Failed to create candidate with Scene ID and Location ID" }
    }
}