import {PrismaClient} from "@prisma/client";
import {prisma} from "@/app/lib/prisma";

export async function login(email : string, password : string, options? : { db? : typeof PrismaClient}): Promise<void> {
    const db = options?.db ?? prisma



}