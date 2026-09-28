'use client'

import { useState, useTransition } from 'react'
import { isActionFailure } from '@/lib/actionResult'

/**
 * Runs a server action from a button or menu (delete, archive, toggle...) inside a transition.
 *
 * The transition lets redirects from the action navigate normally, `isPending` covers the whole call, and a
 * returned Result failure is kept in `error` for the caller to display. `onSuccess` only runs when the
 * action didn't fail; `onFailure` lets the caller roll back optimistic UI.
 */
export function useActionRunner() {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const run = (action: () => Promise<unknown>, callbacks?: { onSuccess?: () => void; onFailure?: () => void }) => {
        setError(null)
        startTransition(async () => {
            const result = await action()
            if (isActionFailure(result)) {
                setError(result.error)
                callbacks?.onFailure?.()
                return
            }
            callbacks?.onSuccess?.()
        })
    }

    return { run, isPending, error, clearError: () => setError(null) }
}
