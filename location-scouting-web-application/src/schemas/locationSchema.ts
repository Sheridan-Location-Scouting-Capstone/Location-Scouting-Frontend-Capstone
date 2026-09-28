import { z } from 'zod'
import {LocationStatus} from "@prisma/client";
// Phone number validation. libphonenumber-js can be used in the future if more rigorous phone validation is required
const phoneRegex = new RegExp(
    /^[\d\s\-+()]{7,20}$/
);

// Shared field rules with no defaults, so partial updates never fill in values the caller didn't send
const LocationFields = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    province: z.string().min(1, 'Province is required'),
    postalCode: z.string().min(1, 'Postal Code is required'),
    country: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    contactName: z.string().min(1).max(70).optional(),
    contactPhone: z.string().regex(phoneRegex, 'Invalid phone number').optional(),
    contactEmail: z.email().optional(),
    notes: z.string().optional(),
    keywords: z.array(z.string()),
})

export const CreateLocationScheme = LocationFields.extend({
    country: LocationFields.shape.country.default('Canada'),
    keywords: LocationFields.shape.keywords.default([]),
})

// Optional text fields accept null so an edit can clear them
export const UpdateLocationScheme = LocationFields.partial().extend({
    contactName: LocationFields.shape.contactName.nullable(),
    contactPhone: LocationFields.shape.contactPhone.nullable(),
    contactEmail: LocationFields.shape.contactEmail.nullable(),
    notes: LocationFields.shape.notes.nullable(),
    status: z.enum(LocationStatus).optional(),
    deletedAt: z.date().nullable().optional(),
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