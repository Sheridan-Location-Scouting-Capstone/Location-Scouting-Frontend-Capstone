'use client'

import { startTransition, useActionState } from 'react'
import { ActionFailure, isActionFailure } from '@/lib/actionResult'

/**
 * Runs a server action from a form submit and keeps its failure (if any) as state.
 *
 * - Dispatching inside a transition lets a successful action's redirect() reach Next's redirect boundary,
 *   instead of being swallowed as an error by the caller.
 * - A returned Result failure becomes `failure`, so the form can show the message and field errors.
 * - The form is submitted through onSubmit rather than the <form action> prop so React doesn't reset the
 *   fields when validation fails.
 */
export function useFormAction(action: (formData: FormData) => Promise<unknown>) {
    const [failure, dispatch, isPending] = useActionState(
        async (_previous: ActionFailure | null, formData: FormData) => {
            const result = await action(formData)
            return isActionFailure(result) ? result : null
        },
        null
    )

    const submit = (formData: FormData) => startTransition(() => dispatch(formData))

    return { failure, submit, isPending }
}
