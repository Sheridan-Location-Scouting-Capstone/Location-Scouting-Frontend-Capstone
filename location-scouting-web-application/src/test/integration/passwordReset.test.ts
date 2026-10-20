import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { auth } from '@/lib/auth'
import { generateTemporaryPassword, resetPassword } from '@/maintenance/passwordReset'
import { ErrorCode } from '@/schemas/result'
import { prisma } from '@/test/setup'
import { expectFailure, expectSuccess } from '@/test/helpers/result'

// The operator's password reset for alpha testers (LS-204), through Better Auth's real server context against the test
// database. Signing in goes through auth.api.signInEmail, the same endpoint the sign-in page calls.

function signIn(email: string, password: string) {
    return auth.api.signInEmail({ body: { email, password } })
}

describe('resetPassword', () => {
    it('should set the new password, so it signs in and the old one no longer does', async () => {
        // Arrange
        const email = `reset-${randomUUID()}@example.com`
        const { user } = await auth.api.signUpEmail({ body: { name: 'Tess Tester', email, password: 'Old@password1' } })

        // Act
        const report = expectSuccess(await resetPassword(email, { password: 'New@password1' }))

        // Assert
        expect(report).toEqual({ userId: user.id, email })
        const signedIn = await signIn(email, 'New@password1')
        expect(signedIn.user.id).toBe(user.id)
        await expect(signIn(email, 'Old@password1')).rejects.toMatchObject({
            body: { code: 'INVALID_EMAIL_OR_PASSWORD' },
        })
    })

    it('should find the user whatever the case or spacing of the email it is given', async () => {
        // Arrange
        const email = `reset-${randomUUID()}@example.com`
        await auth.api.signUpEmail({ body: { name: 'Tess Tester', email, password: 'Old@password1' } })

        // Act
        expectSuccess(await resetPassword(`  ${email.toUpperCase()} `, { password: 'New@password1' }))

        // Assert
        await expect(signIn(email, 'New@password1')).resolves.toBeDefined()
    })

    it('should delete all of the user\'s sessions, and nobody else\'s', async () => {
        // Arrange - signing up starts a session, and each sign-in another
        const email = `reset-${randomUUID()}@example.com`
        const { user } = await auth.api.signUpEmail({ body: { name: 'Tess Tester', email, password: 'Old@password1' } })
        await signIn(email, 'Old@password1')
        await signIn(email, 'Old@password1')
        const otherEmail = `other-${randomUUID()}@example.com`
        const { user: other } = await auth.api.signUpEmail({ body: { name: 'Otto Other', email: otherEmail, password: 'Other@password1' } })
        expect(await prisma.session.count({ where: { userId: user.id } })).toBe(3)

        // Act
        expectSuccess(await resetPassword(email, { password: 'New@password1' }))

        // Assert
        expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0)
        expect(await prisma.session.count({ where: { userId: other.id } })).toBe(1)
    })

    it('should fail clearly for an unknown email and change nothing', async () => {
        // Arrange
        const email = `reset-${randomUUID()}@example.com`
        const { user } = await auth.api.signUpEmail({ body: { name: 'Tess Tester', email, password: 'Old@password1' } })
        const before = {
            accounts: await prisma.account.findMany({ orderBy: { id: 'asc' } }),
            sessions: await prisma.session.findMany({ orderBy: { id: 'asc' } }),
            users: await prisma.user.findMany({ orderBy: { id: 'asc' } }),
        }
        const unknownEmail = `nobody-${randomUUID()}@example.com`

        // Act
        const result = expectFailure(await resetPassword(unknownEmail, { password: 'New@password1' }))

        // Assert
        expect(result.code).toBe(ErrorCode.NOT_FOUND)
        expect(result.error).toBe(`No user has the email ${unknownEmail}. Nothing was changed.`)
        expect({
            accounts: await prisma.account.findMany({ orderBy: { id: 'asc' } }),
            sessions: await prisma.session.findMany({ orderBy: { id: 'asc' } }),
            users: await prisma.user.findMany({ orderBy: { id: 'asc' } }),
        }).toEqual(before)
        await expect(signIn(email, 'Old@password1')).resolves.toMatchObject({ user: { id: user.id } })
    })

    it('should refuse a password Better Auth would reject and change nothing', async () => {
        // Arrange
        const email = `reset-${randomUUID()}@example.com`
        const { user } = await auth.api.signUpEmail({ body: { name: 'Tess Tester', email, password: 'Old@password1' } })
        const accountBefore = await prisma.account.findFirstOrThrow({ where: { userId: user.id } })

        // Act
        const result = expectFailure(await resetPassword(email, { password: 'short' }))

        // Assert
        expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
        expect(await prisma.account.findFirstOrThrow({ where: { userId: user.id } })).toEqual(accountBefore)
        expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1)
    })

    it('should generate a strong temporary password when none is given, and hand it back once', async () => {
        // Arrange
        const email = `reset-${randomUUID()}@example.com`
        await auth.api.signUpEmail({ body: { name: 'Tess Tester', email, password: 'Old@password1' } })

        // Act
        const { generatedPassword } = expectSuccess(await resetPassword(email))

        // Assert - at least 16 characters from a large alphabet, mixing lowercase, uppercase and digits
        expect(generatedPassword).toBeDefined()
        expect(generatedPassword!.length).toBeGreaterThanOrEqual(16)
        expect(generatedPassword).toMatch(/[a-z]/)
        expect(generatedPassword).toMatch(/[A-Z]/)
        expect(generatedPassword).toMatch(/[0-9]/)
        await expect(signIn(email, generatedPassword!)).resolves.toBeDefined()
        const account = await prisma.account.findFirstOrThrow({ where: { providerId: 'credential', user: { email } } })
        expect(account.password).not.toContain(generatedPassword)
    })

    it('should generate a different temporary password every time', () => {
        // Act
        const passwords = Array.from({ length: 50 }, () => generateTemporaryPassword())

        // Assert
        expect(new Set(passwords).size).toBe(50)
        for (const password of passwords) {
            expect(password).toMatch(/^[a-zA-Z0-9]{20}$/)
        }
    })
})
