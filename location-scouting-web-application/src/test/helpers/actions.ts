import { expect, vi } from 'vitest'
import { requireUser, SessionUser } from '@/lib/auth-session'

// Server actions depend on three Next.js request-scoped boundaries that don't exist in a test process:
//   - requireUser()   reads the session from request headers
//   - revalidatePath() needs the Next cache
//   - redirect()      throws a NEXT_REDIRECT error for the framework to catch
// Each action test file mocks these three modules with the factories below and lets everything else
// (services, Prisma, the test database) run for real.
//
//   vi.mock('@/lib/auth-session', () => ({ requireUser: vi.fn() }))
//   vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
//   vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw Object.assign(new Error('NEXT_REDIRECT'), { url }) }) }))

/** Make every subsequent action call run as this user. */
export function actAs(userId: string) {
    vi.mocked(requireUser).mockResolvedValue({ id: userId } as SessionUser)
}

/** Make requireUser() fail the way an unauthenticated request would, without touching any data. */
export function actAsAnonymous() {
    vi.mocked(requireUser).mockRejectedValue(new Error('UNAUTHENTICATED'))
}

/** Assert the action ended in a redirect to the given path (mirrors Next's thrown NEXT_REDIRECT). */
export async function expectRedirect(action: Promise<unknown>, url: string) {
    await expect(action).rejects.toMatchObject({ message: 'NEXT_REDIRECT', url })
}

/** Build a FormData from a plain object, the way a submitted form would arrive at an action. Undefined fields are left out. */
export function formDataFrom(fields: Record<string, string | number | undefined>) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) formData.append(key, String(value))
    }
    return formData
}

/**
 * List every exported action in a module as [name, fn] pairs, for an it.each that checks each one
 * authenticates. Catches a new action that forgets to call requireUser().
 */
export function everyExportedAction(module: Record<string, unknown>) {
    return Object.entries(module)
        .filter(([, value]) => typeof value === 'function')
        .map(([name, fn]) => [name, fn as (...args: unknown[]) => Promise<unknown>] as const)
}
