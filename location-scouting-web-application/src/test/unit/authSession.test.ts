import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetSession, mockHeaders, mockRedirect } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockHeaders: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

import { getCurrentUser, getSession, requireUser } from '@/lib/auth-session'

describe('auth session helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeaders.mockResolvedValue({ cookie: 'session=abc123' })
  })

  it('gets the session from the auth API with request headers', async () => {
    const session = { user: { id: 'user-1', email: 'alex@example.com' } }
    mockGetSession.mockResolvedValue(session)

    await expect(getSession()).resolves.toEqual(session)
    expect(mockHeaders).toHaveBeenCalledTimes(1)
    expect(mockGetSession).toHaveBeenCalledWith({ headers: { cookie: 'session=abc123' } })
  })

  it('returns the current user or null', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1', email: 'alex@example.com' } })
    await expect(getCurrentUser()).resolves.toEqual({ id: 'user-1', email: 'alex@example.com' })

    mockGetSession.mockResolvedValueOnce(null)
    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it('redirects when the current user is missing', async () => {
    mockGetSession.mockResolvedValue(null)

    await expect(requireUser()).rejects.toThrow('REDIRECT:/')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('returns the user when it exists', async () => {
    const user = { id: 'user-1', email: 'alex@example.com' }
    mockGetSession.mockResolvedValue({ user })

    await expect(requireUser()).resolves.toEqual(user)
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
