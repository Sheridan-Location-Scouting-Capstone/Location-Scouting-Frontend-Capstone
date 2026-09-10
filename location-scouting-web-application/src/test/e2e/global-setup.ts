import { startContainers } from '../containers'

export default async function globalSetup() {
    const stop = await startContainers()

    process.env.BETTER_AUTH_SECRET ??= 'e2e-test-secret-not-for-production'
    process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'

    console.log('[e2e] DATABASE_URL =', process.env.DATABASE_URL)

    return stop
}