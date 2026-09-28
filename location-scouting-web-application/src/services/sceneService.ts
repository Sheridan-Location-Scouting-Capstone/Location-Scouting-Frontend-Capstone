import { prisma as defaultPrisma} from '@/lib/prisma'
import { z } from 'zod'
import {CreateSceneSchema, UpdateSceneSchema} from "@/schemas/sceneSchema";
import {getKeywords, KeywordGenerator} from "@/services/keywordGenerator";
import {ErrorCode, Result} from "@/schemas/result";
import {Scene} from "@prisma/client";

const defaultKeywordGenerator: KeywordGenerator = async (scriptContent: string) => {
    return getKeywords(scriptContent)
}

export async function createScene(
    userId: string,
    input: z.infer<typeof CreateSceneSchema>,
    options?: { db?: typeof defaultPrisma, keywordGenerator?: KeywordGenerator }
) : Promise<Result<Scene>> {
    const db = options?.db ?? defaultPrisma
    const keywordGenerator = options?.keywordGenerator ?? defaultKeywordGenerator

    const validated = CreateSceneSchema.parse(input)

    let scene = await db.scene.create({ data: validated })

    keywordGenerator(scene.scriptSection)
        .then(async (response) => {
            if (response.success) {
                scene = await db.scene.update({
                    where: { id: scene.id, project: { userId } },
                    data: { keywords: response.data }
                })
            }
        })

    return { success: true, data: scene }
}

export async function getScenesForProject(
    userId: string,
    projectId: string,
    options?: { db?: typeof defaultPrisma }
) : Promise<Result<Scene[]>> {
    const db = options?.db ?? defaultPrisma

    const scenes = await db.scene.findMany({
        where: { projectId, project: { userId } },
        orderBy: { createdAt: 'asc' }
    })
    return { success: true, data: scenes }
}

export async function getSceneById(
    userId: string,
    sceneId: string,
    options?: { db?: typeof defaultPrisma }
) : Promise<Result<Scene>> {
    const db = options?.db ?? defaultPrisma

    const scene = await db.scene.findUnique({
        where: { id: sceneId, project: { userId } }
    })
    if (!scene) {
        return { success: false, code: ErrorCode.NOT_FOUND, error: 'Scene not found' }
    }
    return { success: true, data: scene }
}

export async function updateScene(
    userId: string,
    sceneId: string,
    input: Partial<z.infer<typeof CreateSceneSchema>>,
    options?: { db?: typeof defaultPrisma, keywordGenerator: KeywordGenerator }
) : Promise<Result<Scene>> {
    const db = options?.db ?? defaultPrisma

    const validated = UpdateSceneSchema.partial().safeParse(input)

    if (!validated.success) {
        return { success: false, code: ErrorCode.VALIDATION_FAILED, error: 'Invalid input' }
    }

    const updatedScene = await db.scene.update({
        where: { id: sceneId, project: { userId } },
        data: validated.data
    })

    return { success: true, data: updatedScene }
}

export async function deleteScene(
    userId: string,
    sceneId: string,
    options?: { db?: typeof defaultPrisma}
) : Promise<Result<void>> {
    const db = options?.db ?? defaultPrisma
    try {
        await db.scene.delete({ where: { id: sceneId, project: { userId } } })
        return { success: true, data: undefined }
    } catch (error) {
        console.log(`Failed to delete scene: ${sceneId}. Due to: ${error}`)
        return { success: false, error: `Failed to delete scene: ${sceneId}` }
    }
}

