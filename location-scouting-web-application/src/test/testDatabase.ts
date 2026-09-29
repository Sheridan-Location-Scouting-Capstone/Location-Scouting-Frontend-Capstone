import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// The test database client, shared by the integration tests (through setup.ts) and the E2E fixtures. It lives apart
// from setup.ts because that file registers Vitest hooks, and Playwright can't load Vitest.
export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.TEST_DATABASE_URL,
        },
    },
})
