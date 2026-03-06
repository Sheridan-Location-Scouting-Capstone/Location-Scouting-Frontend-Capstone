import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { z } from 'zod'
import {CreateSceneSchema} from "@/app/schemas/sceneSchema";

export async function createScene(input: z.infer<typeof CreateSceneSchema>, options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const validated = CreateSceneSchema.parse(input)

    const scene = await db.scene.create({ data: validated })
    return { success: true, data: scene }
}