import { prisma as defaultPrisma} from '@/lib/prisma'
import { CreateProjectSchema } from "@/schemas/projectSchema";
import { z } from 'zod';
import {Project} from "@prisma/client";
import {ErrorCode, fail, ok, Result} from "@/schemas/result";
import {Geocoder} from "@/schemas/geocoder";
import {defaultGeocoder} from "@/services/geocodingService";
import {createLogger} from "@/lib/logger";
import {guard, isRecordNotFound} from "@/services/serviceResult";

const logger = createLogger('productionService')

export type ProjectLocation = {
    locationId: string
    address: string
    city: string
    province: string
    postalCode: string
    latitude?: number
    longitude?: number
}

function formatGeocodingAddress(project: Project) {
    return `${project.address}, ${project.city}, ${project.province}, ${project.postalCode}, ${project.country}`
}

/** The distinct locations used as candidates across a production's scenes */
export async function getLocationsByProject(
    userId: string,
    input: { projectId: string },
    options?: { db?: typeof defaultPrisma }
): Promise<Result<ProjectLocation[]>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get locations for project ${input.projectId}`, async () => {
        const scenes = await db.scene.findMany({
            where: { projectId: input.projectId, project: { userId } },
            include: { candidates: { where: { location: { userId } }, include: { location: true } } },
        })

        const locations = new Map<string, ProjectLocation>()
        for (const scene of scenes) {
            for (const { locationId, location } of scene.candidates) {
                if (!locations.has(locationId)) {
                    locations.set(locationId, {
                        locationId,
                        address: location.address,
                        city: location.city,
                        province: location.province,
                        postalCode: location.postalCode,
                        latitude: location.latitude ?? undefined,
                        longitude: location.longitude ?? undefined,
                    })
                }
            }
        }

        return ok(Array.from(locations.values()))
    })
}

export async function createProject(
    userId: string,
    input: z.infer<typeof CreateProjectSchema>,
    options?: { db?: typeof defaultPrisma, geocoder?: Geocoder }
) : Promise<Result<Project>> {
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder

    const validated = CreateProjectSchema.safeParse(input)
    if (!validated.success) {
        return fail(ErrorCode.VALIDATION_FAILED, 'Invalid project data', z.flattenError(validated.error).fieldErrors)
    }

    return guard(logger, 'create project', async () => {
        const project = await db.project.create({ data: { ...validated.data, userId } })

        // Fire and forget: the client doesn't need coordinates right away and can refetch.
        // Potentially move to a queue so failed lookups are retried.
        geocoder(formatGeocodingAddress(project))
            .then(async coords => {
                if (coords) {
                    await db.project.update({
                        where: { id: project.id },
                        data: { latitude: coords.lat, longitude: coords.lng }
                    })
                }
            })
            .catch((error) => logger.warn(`Failed to geocode project ${project.id}`, error))

        return ok(project)
    })
}

export async function getProjects(userId:string, options?: { db?: typeof defaultPrisma }) : Promise<Result<Project[]>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, 'get projects', async () => ok(await db.project.findMany({ where: { userId } })))
}

export async function getProjectById(userId: string, id: string, options?: {db?: typeof defaultPrisma}): Promise<Result<Project>> {
    const db = options?.db ?? defaultPrisma

    return guard(logger, `get project ${id}`, async () => {
        const project = await db.project.findUnique({ where: { id, userId } })
        if (!project) {
            return fail(ErrorCode.NOT_FOUND, `Project not found: ${id}`)
        }
        return ok(project)
    })
}

export async function updateProject(
    userId: string,
    id: string,
    input: Partial<z.infer<typeof CreateProjectSchema>>,
    options?: { db?: typeof defaultPrisma; geocoder?: Geocoder }
): Promise<Result<Project>> {
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder

    const validated = CreateProjectSchema.partial().safeParse(input)
    if (!validated.success) {
        return fail(ErrorCode.VALIDATION_FAILED, 'Invalid project data', z.flattenError(validated.error).fieldErrors)
    }

    return guard(logger, `update project ${id}`, async () => {
        let project: Project
        try {
            project = await db.project.update({ where: { id, userId }, data: validated.data })
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, `Project not found: ${id}`)
            }
            throw error
        }

        // Re-geocode from the full saved address if any address field changed
        const data = validated.data
        if (data.address || data.city || data.province || data.postalCode || data.country) {
            geocoder(formatGeocodingAddress(project))
                .then(async (coords) => {
                    if (coords) {
                        await db.project.update({
                            where: { id, userId },
                            data: { latitude: coords.lat, longitude: coords.lng },
                        })
                    }
                })
                // Clear stale coordinates so the old address doesn't keep pointing at the wrong place on a map
                .catch(async () => {
                    await db.project.update({
                        where: { id, userId },
                        data: { latitude: null, longitude: null },
                    }).catch((error) => logger.error(`Failed to clear coordinates for project ${id}`, error))
                })
        }

        return ok(project)
    })
}
