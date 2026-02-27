import 'dotenv/config'
import { PrismaClient } from "@prisma/client"
import { beforeAll, beforeEach, afterAll } from 'vitest'
import {ensureBucketExists} from "@/app/services/photoService";
import * as Minio from 'minio'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.TEST_DATABASE_URL,
        },
    },
})


const testBucket = process.env.MINIO_TEST_BUCKET || 'location-photos-test'
const minio = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

beforeAll(async () => {
    // Connect to the test database
    await prisma.$connect()
    await ensureBucketExists(testBucket)
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

    // Clean MinIO bucket
    const objects = await new Promise<string[]>((resolve, reject) => {
        const keys: string[] = []
        const stream = minio.listObjects(testBucket)
        stream.on('data', obj => keys.push(obj.name!))
        stream.on('end', () => resolve(keys))
        stream.on('error', reject)
    })

    await Promise.all(objects.map(key => minio.removeObject(testBucket, key)))
})

afterAll(async () => {
    await prisma.$disconnect()
})

export { prisma }

