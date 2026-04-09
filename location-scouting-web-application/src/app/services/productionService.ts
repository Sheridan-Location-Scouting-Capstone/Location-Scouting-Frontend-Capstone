import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { CreateProjectSchema } from "@/app/schemas/projectSchema";
import { z } from 'zod';
import {Project} from "@prisma/client";
import {Result} from "@/app/schemas/result";
import {Geocoder} from "@/app/schemas/geocoder";
import {defaultGeocoder} from "@/app/services/locationService";

export async function getLocationsByProject(
  input: { projectId: string },
  options?: { db?: typeof defaultPrisma }
) {
  const db = options?.db ?? defaultPrisma;

  const scenes = await db.scene.findMany({
    where: {
      projectId: input.projectId,
    },
    include: {
      candidates: {
        include: {
          location: true,
        },
      },
    },
  });

  const locationMap = new Map<string, {
    locationId: string,
    address: string,
    city: string,
    province: string,
    postalCode: string,
    latitude?: number,
    longitude?: number,
  }>();

  for (const scene of scenes) {
    for (const candidate of scene.candidates) {
      if (!locationMap.has(candidate.locationId)) {
        locationMap.set(candidate.locationId, {
          locationId: candidate.locationId,
          address: candidate.location.address,
          city: candidate.location.city,
          province: candidate.location.province,
          postalCode: candidate.location.postalCode,
          latitude: candidate.location.latitude ?? undefined,
          longitude: candidate.location.longitude ?? undefined,
        });
      }
    }
  }

  return { success: true, data: Array.from(locationMap.values()) };
}

const dGeocoder = defaultGeocoder;

export async function createProject(input: z.infer<typeof CreateProjectSchema>, options?: { db?: typeof defaultPrisma, geocoder?: Geocoder }) {
    const db = options?.db ?? defaultPrisma
    const gc = options?.geocoder ?? defaultGeocoder

    try {
        const validated = CreateProjectSchema.parse(input)

        const project = await db.project.create({data: validated})
        const address = `${project.address}, ${project.city}, ${project.province}, ${project.postalCode}, ${project.country}`

        // fire and forget pattern. Assuming the client will not need the lat-long right away and can refetch if needed.
        gc(address)
            .then(async coords => {
                if (coords) {
                    console.log(`Setting coords for production: ${coords}`)
                    await db.project.update({
                        where: {id: project.id},
                        data: {latitude: coords.lat, longitude: coords.lng}
                    })
                }
            })
            .catch(() => {
            }) // swallow geocoding errors silently. Potentially add a queue system here to retry periodically or on a cron job
        return { success: true, data: project }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to create the project"}
    }
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

export async function updateProject(
    id: string,
    input: Partial<z.infer<typeof CreateProjectSchema>>,
    options?: { db?: typeof defaultPrisma; geocoder?: Geocoder }
): Promise<Result<Project>> {
    const db = options?.db ?? defaultPrisma
    const geocoder = options?.geocoder ?? defaultGeocoder

    try {
        const project = await db.project.update({
            where: { id },
            data: input,
        })

        // Re-geocode if any address field changed
        if (input.address || input.city || input.province || input.postalCode || input.country) {
            const full = await db.project.findUnique({ where: { id } })
            if (full) {
                const address = `${full.address}, ${full.city}, ${full.province}, ${full.postalCode}, ${full.country}`
                geocoder(address)
                    .then(async (coords) => {
                        if (coords) {
                            await db.project.update({
                                where: { id },
                                data: { latitude: coords.lat, longitude: coords.lng },
                            })
                        }
                    })
                    .catch(async () => {
                        await db.project.update({
                            where: { id },
                            data: { latitude: null, longitude: null },
                        })
                    })
            }
        }

        return { success: true, data: project }
    } catch (error) {
        return { success: false, error: `Failed to update project: ${id}` }
    }
}