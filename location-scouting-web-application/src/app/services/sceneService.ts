import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { z } from 'zod'
import {CreateSceneSchema} from "@/app/schemas/sceneSchema";

export async function createScene(input: z.infer<typeof CreateSceneSchema>, options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const validated = CreateSceneSchema.parse(input)

    const scene = await db.scene.create({ data: validated })

    const response = await fetch('http://3.239.10.251/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            scene: sanitizeSceneContent(scene.scriptSection)
        })
    })
    if (response.ok) {
        const keywords: string[] = await response.json()
        if(keywords.length > 0) {
            const sceneWithKeywords = await db.scene.update({
                where: {id: scene.id},
                data: {keywords: keywords }
            })

            return { success: true, data: sceneWithKeywords }
        }

        return { success: false, data: scene }
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

function sanitizeSceneContent(text: string): string {
    return text.replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}