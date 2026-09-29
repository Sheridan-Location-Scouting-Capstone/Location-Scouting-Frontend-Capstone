import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import { externalServiceMockEnv, externalServiceMocksEnabled, objectStoreTestEnv } from './src/test/containers'

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
            // Photos go to the Garage test container global setup starts
            ...objectStoreTestEnv(),
            // Vision, keyword generation and geocoding go to the WireMock container global setup starts, so E2E runs
            // never spend Vision credits. EXTERNAL_SERVICE_MOCKS=off in .env.e2e uses the real services instead.
            ...(externalServiceMocksEnabled() ? externalServiceMockEnv() : {}),
        }
    },
})