import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.e2e', override: true })

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
    testDir: './src/test/e2e',
    globalSetup: './src/test/e2e/global-setup.ts',
    workers: 1,
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: [['html', { open: 'never' }], ['list']],
    expect: { timeout: 10_000 },
    use: {
        baseURL: baseURL,
        extraHTTPHeaders: { origin: baseURL },
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'npm run start',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
            DATABASE_URL: process.env.DATABASE_URL!,
            BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
            BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
            MINIO_ENDPOINT: process.env.MINIO_ENDPOINT!,
            MINIO_PORT: process.env.MINIO_PORT!,
            MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY!,
            MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY!,
            MINIO_BUCKET: process.env.MINIO_TEST_BUCKET!,
        }
    },
})