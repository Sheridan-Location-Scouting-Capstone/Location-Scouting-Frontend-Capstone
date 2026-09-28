import { prisma as defaultPrisma} from '@/lib/prisma'
import { z } from 'zod'
import {CreateSceneSchema, UpdateSceneSchema} from "@/schemas/sceneSchema";
import {getKeywords, KeywordGenerator} from "@/services/keywordGenerator";
import {ErrorCode, fail, ok, Result} from "@/schemas/result";
import {Scene} from "@prisma/client";
import {createLogger} from "@/lib/logger";
import {guard, isRecordNotFound} from "@/services/serviceResult";

const logger = createLogger('sceneService')

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

    const parsed = CreateSceneSchema.safeParse(input)
    if (!parsed.success) {
        return fail(ErrorCode.VALIDATION_FAILED, 'Invalid scene data', z.flattenError(parsed.error).fieldErrors)
    }
    const validated = parsed.data

    return guard(logger, 'create scene', async () => {
        const project = await db.project.findFirst({
            where: { id: validated.projectId, userId },
            select: { id: true }
        })
        if (!project) {
            return fail(ErrorCode.NOT_FOUND, 'Project not found')
        }

        const scene = await db.scene.create({ data: validated })

        keywordGenerator(scene.scriptSection)
            .then(async (response) => {
                if (response.success) {
                    await db.scene.update({
                        where: { id: scene.id, project: { userId } },
                        data: { keywords: response.data }
                    })
                }
            })
            // The scene may be deleted before keywords come back; that's not an error worth surfacing
            .catch((error) => logger.warn(`Failed to save generated keywords for scene ${scene.id}`, error))

        return ok(scene)
    })
}

export async function getScenesForProject(
    userId: string,
    projectId: string,
    options?: { db?: typeof defaultPrisma }
) : Promise<Result<Scene[]>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get scenes for project ${projectId}`, async () => {
        const scenes = await db.scene.findMany({
            where: { projectId, project: { userId } },
            orderBy: { createdAt: 'asc' }
        })
        return ok(scenes)
    })
}

export async function getSceneById(
    userId: string,
    sceneId: string,
    options?: { db?: typeof defaultPrisma }
) : Promise<Result<Scene>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get scene ${sceneId}`, async () => {
        const scene = await db.scene.findUnique({
            where: { id: sceneId, project: { userId } }
        })
        if (!scene) {
            return fail(ErrorCode.NOT_FOUND, 'Scene not found')
        }
        return ok(scene)
    })
}

export async function updateScene(
    userId: string,
    sceneId: string,
    input: Partial<z.infer<typeof CreateSceneSchema>>,
    options?: { db?: typeof defaultPrisma, keywordGenerator?: KeywordGenerator }
) : Promise<Result<Scene>> {
    const db = options?.db ?? defaultPrisma

    const validated = UpdateSceneSchema.partial().safeParse(input)
    if (!validated.success) {
        return fail(ErrorCode.VALIDATION_FAILED, 'Invalid scene data', z.flattenError(validated.error).fieldErrors)
    }

    return guard(logger, `update scene ${sceneId}`, async () => {
        // Moving a scene is only allowed into another project the user also owns
        if (validated.data.projectId) {
            const targetProject = await db.project.findFirst({
                where: { id: validated.data.projectId, userId },
                select: { id: true }
            })
            if (!targetProject) {
                return fail(ErrorCode.NOT_FOUND, 'Project not found')
            }
        }

        try {
            const updatedScene = await db.scene.update({
                where: { id: sceneId, project: { userId } },
                data: validated.data
            })
            return ok(updatedScene)
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, 'Scene not found')
            }
            throw error
        }
    })
}

export async function deleteScene(
    userId: string,
    sceneId: string,
    options?: { db?: typeof defaultPrisma}
) : Promise<Result<void>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `delete scene ${sceneId}`, async () => {
        try {
            await db.scene.delete({ where: { id: sceneId, project: { userId } } })
            return ok(undefined)
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, 'Scene not found')
            }
            throw error
        }
    })
}
