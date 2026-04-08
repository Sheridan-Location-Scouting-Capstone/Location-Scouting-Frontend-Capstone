import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { CreateProjectSchema } from "@/app/schemas/projectSchema";
import { z } from 'zod';
import {Project} from "@prisma/client";
import {Result} from "@/app/schemas/result";
import {Geocoder} from "@/app/schemas/geocoder";
import {defaultGeocoder} from "@/app/services/locationService";

const dGeocoder = defaultGeocoder;

export async function createProject(input: z.infer<typeof CreateProjectSchema>, options?: { db?: typeof defaultPrisma, geocoder?: Geocoder }) {
    const db = options?.db ?? defaultPrisma
    const gc = options?.geocoder ?? defaultGeocoder

    const validated = CreateProjectSchema.parse(input)

    const project = await db.project.create({ data: validated })
    const address = `${project.address}, ${project.city}, ${project.province}, ${project.postalCode}, ${project.country}`

    // fire and forget pattern. Assuming the client will not need the lat-long right away and can refetch if needed.
    gc(address)
        .then(async coords => {
            if (coords) {
                console.log(`Setting coords for production: ${coords}`)
                await db.project.update({
                    where: { id: project.id},
                    data: { latitude: coords.lat, longitude: coords.lng }
                })
            }
        })
        .catch(() => {}) // swallow geocoding errors silently. Potentially add a queue system here to retry periodically or on a cron job

    return { success: true, data: project }
}

export async function getProjects(options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const projects = await db.project.findMany()
    return { success: true, data: projects }
}

export async function getProjectById(id: string, options?: {db?: typeof defaultPrisma}): Promise<Result<Project>> {
    const db = options?.db ?? defaultPrisma

    const project = await db.project.findUnique({ where: { id } })
    if(!project) {
        return { success: false, error: "Project not found" }
    } else {
        return { success: true, data: project }
    }
}