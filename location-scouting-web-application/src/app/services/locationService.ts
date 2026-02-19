import { prisma as defaultPrisma} from '@/app/lib/prisma'
import {Location, Prisma, PrismaClient } from "@prisma/client";
import {CreateLocationScheme} from "@/app/schemas/locationSchema";

export async function createLocation(
    input: Prisma.LocationCreateInput,
    db: PrismaClient = defaultPrisma
) {
    if (input.contactPhone) {
        input.contactPhone = input.contactPhone.replaceAll('-', '')
        input.contactPhone = input.contactPhone.replaceAll('(', '')
        input.contactPhone = input.contactPhone.replaceAll(')', '')
    }
    const validated = CreateLocationScheme.parse(input)
    return db.location.create({
        data: validated
    });
}
