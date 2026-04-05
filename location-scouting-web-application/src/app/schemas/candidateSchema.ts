import { z } from 'zod'


export const CreateCandidateSchema = z.object({
    sceneId: z.string().min(1, 'Scene ID is required'),
    locationId: z.string().min(1, 'Location ID is required'),
    photos: z.string().array().optional(),
    selected: z.boolean().optional()
})