// Moves stored photos into their owners' storage prefixes, users/<userId>/photos/ (LS-182). Safe to run again.
//
//   npm run storage:migrate-photo-keys               moves them
//   npm run storage:migrate-photo-keys -- --dry-run  only reports what it would do
//
// Uses DATABASE_URL and the OBJECT_STORE_* settings from .env, like the app.

import 'dotenv/config'
import { migratePhotoKeysToOwnerPrefix } from '@/maintenance/photoKeyMigration'
import { prisma } from '@/lib/prisma'

async function main(): Promise<number> {
    const dryRun = process.argv.includes('--dry-run')
    const result = await migratePhotoKeysToOwnerPrefix({ dryRun })
    await prisma.$disconnect()

    if (!result.success) {
        console.error(result.error)
        return 1
    }

    const { moved, alreadyInPlace, missing, skipped, leftovers } = result.data
    console.log(`${dryRun ? 'Would move' : 'Moved'} ${moved} photo(s); ${alreadyInPlace} already in place.`)
    if (missing.length > 0) console.log(`No file in storage, rows left as they were: ${missing.join(', ')}`)
    if (skipped.length > 0) console.log(`Changed while being moved; run again to retry: ${skipped.join(', ')}`)
    if (leftovers.length > 0) console.log(`Moved, but the old file couldn't be deleted: ${leftovers.join(', ')}`)
    return 0
}

main().then(
    (code) => process.exit(code),
    (error) => {
        console.error(error)
        process.exit(1)
    },
)
