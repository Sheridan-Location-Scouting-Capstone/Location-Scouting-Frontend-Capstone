// Resets an alpha tester's password for the operator (LS-204). Self-service reset (LS-150) and email (LS-183) come with
// the beta; until then the operator verifies the tester out-of-band and runs scripts/reset-password.ts (see README).
//
// Everything goes through Better Auth's own server context, the same calls its reset-password endpoint makes: the
// password is hashed with its configured hasher, written to the user's credential account by its internal adapter, and
// then every session the user has is deleted, so nobody stays signed in with the old password. The password is never
// logged; the caller decides whether to show a generated one.

import { randomInt } from 'node:crypto'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logger'
import { ErrorCode, fail, ok, Result } from '@/schemas/result'
import { guard } from '@/services/serviceResult'

const logger = createLogger('passwordReset')

type BetterAuthContext = Awaited<typeof auth.$context>

/** The parts of Better Auth's server context a reset uses */
export type PasswordResetAuthContext = {
    password: Pick<BetterAuthContext['password'], 'hash' | 'config'>
    internalAdapter: Pick<
        BetterAuthContext['internalAdapter'],
        'findUserByEmail' | 'findCredentialAccount' | 'updatePassword' | 'deleteUserSessions'
    >
}

export type PasswordResetReport = {
    userId: string
    email: string
    /** The new password, only when it was generated here; a password the operator chose isn't handed back */
    generatedPassword?: string
}

// No look-alikes (0/O, 1/l/I), so a tester can type it from a message
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const ALPHABET = LOWER + UPPER + DIGITS
export const GENERATED_PASSWORD_LENGTH = 20

/**
 * A random temporary password from the OS's CSPRNG: 20 characters from 57, about 116 bits, with at least one lowercase
 * letter, uppercase letter and digit.
 */
export function generateTemporaryPassword(): string {
    for (;;) {
        let password = ''
        for (let i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
            password += ALPHABET[randomInt(ALPHABET.length)]
        }
        if ([LOWER, UPPER, DIGITS].every((set) => [...password].some((c) => set.includes(c)))) {
            return password
        }
    }
}

/**
 * Sets a new password for the user with this email and signs them out everywhere. Without `password`, a temporary one
 * is generated and returned in the report. An unknown email, or a password Better Auth would reject, changes nothing.
 */
export async function resetPassword(
    email: string,
    options?: {
        password?: string
        authContext?: PasswordResetAuthContext | Promise<PasswordResetAuthContext>
        generatePassword?: () => string
    }
): Promise<Result<PasswordResetReport>> {
    return guard(logger, 'reset password', async () => {
        const ctx = await (options?.authContext ?? auth.$context)
        const generatePassword = options?.generatePassword ?? generateTemporaryPassword

        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) {
            return fail(ErrorCode.VALIDATION_FAILED, 'An email is required.')
        }

        const generated = options?.password === undefined
        const password = options?.password ?? generatePassword()
        const { minPasswordLength, maxPasswordLength } = ctx.password.config
        if (password.length < minPasswordLength || password.length > maxPasswordLength) {
            return fail(
                ErrorCode.VALIDATION_FAILED,
                `The password must be ${minPasswordLength} to ${maxPasswordLength} characters long.`,
            )
        }

        const found = await ctx.internalAdapter.findUserByEmail(normalizedEmail)
        if (!found) {
            return fail(ErrorCode.NOT_FOUND, `No user has the email ${normalizedEmail}. Nothing was changed.`)
        }
        const { user } = found

        // Every account in the app signs in by email and password, so this only fails if the data is broken. Better
        // Auth's own reset would add a credential account here; we'd rather not give a password to an account that
        // never had one without someone looking at it first.
        if (!await ctx.internalAdapter.findCredentialAccount(user.id)) {
            return fail(
                ErrorCode.NOT_FOUND,
                `The user with the email ${normalizedEmail} has no password sign-in. Nothing was changed.`,
            )
        }

        // Password first, then sessions, as Better Auth's reset does: if the second step fails, running it again
        // still ends with only the new password working and nobody signed in.
        await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(password))
        await ctx.internalAdapter.deleteUserSessions(user.id)

        logger.info(`Reset the password for user ${user.id} and signed out their sessions`)
        return ok({
            userId: user.id,
            email: user.email,
            ...(generated ? { generatedPassword: password } : {}),
        })
    })
}
