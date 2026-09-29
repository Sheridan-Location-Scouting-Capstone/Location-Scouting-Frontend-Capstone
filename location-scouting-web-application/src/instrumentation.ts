// Runs once when the Next.js server starts (not during `next build`).

export async function register() {
    // The edge runtime has no Node APIs and never touches object storage
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { assertStorageConfigured } = await import('@/infrastructure/storage')
        try {
            assertStorageConfigured()
        } catch (error) {
            // Next.js would otherwise keep running and answer every request with a 500. Stop instead, so a
            // misconfigured server fails at boot, visibly, rather than looking up but broken.
            console.error((error as Error).message)
            process.exit(1)
        }
    }
}
