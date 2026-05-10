import { z } from 'zod'

export const CreateProjectSchema = z.object({
    name:       z.string().min(1, 'Project name is required'),
    address:    z.string().min(1, 'Street address is required'),
    city:       z.string().min(1, 'City is required'),
    province:   z.string().min(1, 'Province is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country:    z.string().min(1, 'Country is required').optional()
})


interface ProjectSchema {
    id:         number;
    name:       string;
    street:     string;
    city:       string;
    province:   string;
    postal:     string;
}