import { prisma as defaultPrisma} from '@/app/lib/prisma'
import { CreateProjectSchema } from "@/app/schemas/projectSchema";
import { z } from 'zod';



export async function createProject(input: z.infer<typeof CreateProjectSchema>, options?: { db?: typeof defaultPrisma }) {
    const db = options?.db ?? defaultPrisma

    const validated = CreateProjectSchema.parse(input)

    const project = await db.project.create({ data: validated })
    return { success: true, data: project }
}