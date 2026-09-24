
export const ERROR_STATUS = {
    VALIDATION_FAILED: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    ALREADY_EXISTS: 409,
    LIMIT_EXCEEDED: 422,
    UNAVAILABLE: 503,
    INTERNAL_SERVER_ERROR: 500,
} as const
export type ErrorCode = keyof typeof ERROR_STATUS

export class AppError extends Error {
    override name = 'AppError'
    readonly isAppError = true
    constructor(
        readonly code: ErrorCode,
        message: string,
        readonly details?: unknown,
        options?: ErrorOptions
    ) { super(message, options) }
}

export const isAppError = (e: unknown): e is AppError =>
    typeof e === 'object' && e !== null && (e as {isAppError?: unknown}).isAppError === true

// For "impossible" states: a bug, deliberately NOT an AppError
export function invariant(condition: unknown, msg: string): asserts condition {
    if (!condition) throw new Error(`Invariant failed: ${msg}`)
}