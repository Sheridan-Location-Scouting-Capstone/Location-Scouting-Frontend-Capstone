// Resets an alpha tester's password and signs them out everywhere (LS-204). Verify who's asking out-of-band first; the
// README has the whole procedure.
//
//   npm run admin:reset-password -- --email tester@example.com                     generates a temporary password
//   npm run admin:reset-password -- --email tester@example.com --password '<temp>' sets the one you give
//
// A generated password is the only thing written to stdout, once, so nothing else in the output ever holds it. The
// confirmation goes to stderr. An unknown email exits with 1 and changes nothing.
//
// Uses DATABASE_URL and the BETTER_AUTH_* settings from .env, like the app.

import 'dotenv/config'
import { parseArgs } from 'node:util'
import { resetPassword } from '@/maintenance/passwordReset'
import { prisma } from '@/lib/prisma'

const USAGE = 'Usage: npm run admin:reset-password -- --email <email> [--password <temporary password>]'

async function main(): Promise<number> {
    let email: string | undefined
    let password: string | undefined
    try {
        const { values } = parseArgs({
            options: { email: { type: 'string' }, password: { type: 'string' } },
            strict: true,
        })
        email = values.email
        password = values.password
    } catch (error) {
        console.error(error instanceof Error ? error.message : error)
        console.error(USAGE)
        return 2
    }
    if (!email) {
        console.error(USAGE)
        return 2
    }

    const result = await resetPassword(email, { password })
    await prisma.$disconnect()

    if (!result.success) {
        console.error(result.error)
        return 1
    }

    const { email: userEmail, userId, generatedPassword } = result.data
    console.error(`Reset the password for ${userEmail} (user ${userId}) and signed them out of every session.`)
    if (generatedPassword) {
        console.error('Their temporary password is below. Send it over a different channel from the request, and ask them to change it after signing in.')
        console.log(generatedPassword)
    }
    return 0
}

main().then(
    (code) => process.exit(code),
    (error) => {
        console.error(error)
        process.exit(1)
    },
)
