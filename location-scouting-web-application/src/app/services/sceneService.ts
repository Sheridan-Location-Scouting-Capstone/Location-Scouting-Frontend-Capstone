import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { z } from 'zod'
import {CreateSceneSchema} from "@/app/schemas/sceneSchema";
import {getKeywords, KeywordGenerator} from "@/app/services/keywordGenerator";
import {Result} from "@/app/schemas/result";
import {Scene} from "@prisma/client";

const defaultKeywordGenerator: KeywordGenerator = async (scriptContent: string) => {
    return getKeywords(scriptContent)
}

export async function createScene(input: z.infer<typeof CreateSceneSchema>, options?: { db?: typeof defaultPrisma, keywordGenerator?: KeywordGenerator }) {
    const db = options?.db ?? defaultPrisma
    const keywordGenerator = options?.keywordGenerator ?? defaultKeywordGenerator

    const validated = CreateSceneSchema.parse(input)

    let scene = await db.scene.create({ data: validated })

    const response = await keywordGenerator(scene.scriptSection)
    if (response.success) {
            scene = await db.scene.update({
                where: { id: scene.id },
                data: { keywords: response.data }
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

export async function getSceneById(sceneId: string, options?: { db?: typeof defaultPrisma }) : Promise<Result<Scene>> {
    const db = options?.db ?? defaultPrisma

    const scene = await db.scene.findUnique({
        where: { id: sceneId }
    })
    if (!scene) {
        return { success: false, error: 'Scene not found' }
    }
    return { success: true, data: scene }
}

export async function updateScene(sceneId: string, input: Partial<z.infer<typeof CreateSceneSchema>>, options?: { db?: typeof defaultPrisma, keywordGenerator: KeywordGenerator }) {
    const db = options?.db ?? defaultPrisma

    const validated = CreateSceneSchema.partial().parse(input)

    const updatedScene = await db.scene.update({
        where: { id: sceneId },
        data: validated
    })




    return { success: true, data: updatedScene }
}

export async function deleteScene(sceneId: string, options?: { db?: typeof defaultPrisma}) {
    const db = options?.db ?? defaultPrisma
    try {
        await db.scene.delete({ where: { id: sceneId } })
        return { success: true, data: undefined }
    } catch (error) {
        console.log(`Failed to delete scene: ${sceneId}. Due to: ${error}`)
        return { success: false, error: `Failed to delete scene: ${sceneId}` }
    }
}

