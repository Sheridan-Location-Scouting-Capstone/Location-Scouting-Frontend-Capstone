import 'dotenv/config'
import { beforeAll, beforeEach, afterAll } from 'vitest'
import { emptyTestBucket } from '@/test/helpers/testBucket'
import { prisma } from '@/test/testDatabase'


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

    // Clean the object storage bucket (Garage creates it when the test container starts)
    await emptyTestBucket()
})

afterAll(async () => {
    await prisma.$disconnect()
})

export { prisma }

