import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { CreateProjectSchema } from "@/app/schemas/projectSchema";
import { z } from 'zod';
import {Project} from "@prisma/client";
import {Result} from "@/app/schemas/result";

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
    locationId: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  }>();

  for (const scene of scenes) {
    for (const candidate of scene.candidates) {
      if (!locationMap.has(candidate.locationId)) {
        locationMap.set(candidate.locationId, {
          locationId: candidate.location.id,
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

export async function createProject(input: z.infer<typeof CreateProjectSchema>, options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const validated = CreateProjectSchema.parse(input)

    const project = await db.project.create({ data: validated })
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