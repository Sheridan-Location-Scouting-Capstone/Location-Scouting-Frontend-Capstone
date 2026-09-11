import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './src/test/e2e',
    globalSetup: './src/test/e2e/global-setup.ts',
    workers: 1,
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: [['html', { open: 'never' }], ['list']],
    expect: { timeout: 10_000 },
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
})