import type { Failure } from '@/schemas/result'

export type ActionFailure = Failure

/** True when a server action returned a failed Result. Actions that redirect on success return nothing. */
export function isActionFailure(value: unknown): value is ActionFailure {
    return typeof value === 'object'
        && value !== null
        && 'success' in value
        && value.success === false
}

/** First validation message for a field, for a TextField's helperText */
export function fieldError(failure: ActionFailure | null, field: string): string | undefined {
    return failure?.fieldErrors?.[field]?.[0]
}

/** error + helperText props for a TextField bound to a field of the failed action */
export function fieldErrorProps(failure: ActionFailure | null, field: string) {
    const message = fieldError(failure, field)
    return message ? { error: true, helperText: message } : {}
}
