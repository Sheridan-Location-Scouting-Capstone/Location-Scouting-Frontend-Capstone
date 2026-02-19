import { z } from 'zod'
// Phone number validation. libphonenumber-js can be used in the future if more rigorous phone validation is required
const phoneRegex = new RegExp(
    /^[\d\s\-+()]{7,20}$/
);

export const CreateLocationScheme = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    province: z.string().min(1, 'Province is required'),
    postalCode: z.string().min(1, 'Postal Code is required'),
    country: z.string().default('Canada'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    contactName: z.string().min(1).max(70).optional(),
    contactPhone: z.string().regex(phoneRegex, 'Invalid phone number').optional(),
    contactEmail: z.email().optional(),
    notes: z.string().optional(),
    keywords: z.array(z.string()).default([]),
})

interface LocationSchema {
    id: number;
    name: string;
    contact: string;
    province: string;
    city: string;
    zipcode: string;
    address: string;
    locationKeywords: string[]
}

// Note: that multiple locations can use the same photo