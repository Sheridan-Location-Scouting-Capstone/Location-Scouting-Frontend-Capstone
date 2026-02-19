import 'dotenv/config'
import { PrismaClient } from "@prisma/client"
import { beforeAll, beforeEach, afterAll } from 'vitest'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.TEST_DATABASE_URL,
        },
    },
})

beforeAll(async () => {
    // Connect to the test database
    await prisma.$connect()
})

beforeEach(async () =>  {
    // Clean all tables before each test
    const tables = await prisma.$queryRaw<{ tablename: string}[]>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `

    for(const { tablename } of tables) {
        if (tablename !== '_prisma_migrations') {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`)
        }
    }
})

afterAll(async () => {
    await prisma.$disconnect()
})

export { prisma }

