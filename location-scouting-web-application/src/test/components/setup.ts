import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Component tests render client components in jsdom without a Next.js app router mounted.
// next/link and next/navigation are replaced with minimal stand-ins; server actions are mocked per test file.

vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
        createElement('a', { href, ...props }, children),
}))

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/',
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
}))

// The photo picker previews files with object URLs. Vitest's jsdom shim for these can't read jsdom Files, so stub them
let objectUrlCounter = 0
URL.createObjectURL = vi.fn(() => `blob:test/${objectUrlCounter++}`)
URL.revokeObjectURL = vi.fn()

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

