import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { z } from 'zod'
import {CreateSceneSchema} from "@/app/schemas/sceneSchema";
import {getKeywords, KeywordGenerator} from "@/app/services/keywordGenerator";

const defaultKeywordGenerator: KeywordGenerator = async (scriptContent: string) => {
    return getKeywords(scriptContent)
}

export async function createScene(input: z.infer<typeof CreateSceneSchema>, options?: { db?: typeof defaultPrisma, keywordGenerator?: KeywordGenerator }) {
    const db = options?.db ?? defaultPrisma
    const keywordGenerator = options?.keywordGenerator ?? defaultKeywordGenerator

    const validated = CreateSceneSchema.parse(input)

    let scene = await db.scene.create({ data: validated })

    const response = await keywordGenerator(scene.scriptSection)
    if (response.length > 0) {
            scene = await db.scene.update({
                where: {id: scene.id},
                data: {keywords: response }
            })
        }
    return { success: true, data: scene }
}

export async function getScenesForProject(projectId: string, options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const scenes = await db.scene.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' }
    })
    return { success: true, data: scenes }
}

export async function getSceneById(sceneId: string, options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const scene = await db.scene.findUnique({
        where: { id: sceneId }
    })
    if (!scene) {
        return { success: false, error: 'Scene not found' }
    }
    return { success: true, data: scene }
}

export async function updateScene(sceneId: string, input: Partial<z.infer<typeof CreateSceneSchema>>, options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const validated = CreateSceneSchema.partial().parse(input)

    const updatedScene = await db.scene.update({
        where: { id: sceneId },
        data: validated
    })
    return { success: true, data: updatedScene }
}

