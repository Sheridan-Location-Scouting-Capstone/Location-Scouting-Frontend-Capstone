// The Result pattern: every service and action reports expected failures by returning a Result, never by throwing.
// ErrorCode is the single source of truth for failure categories across the app.

export const ErrorCode = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
    UNAVAILABLE: 'UNAVAILABLE',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

/** HTTP status for each error code, for API route handlers that need to turn a failed Result into a response */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
    VALIDATION_FAILED: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    ALREADY_EXISTS: 409,
    LIMIT_EXCEEDED: 422,
    INTERNAL_SERVER_ERROR: 500,
    UNAVAILABLE: 503,
}

export type FieldErrors = Record<string, string[] | undefined>

export type Failure = { success: false; code: ErrorCode; error: string; fieldErrors?: FieldErrors }

export type Result<T> = { success: true; data: T } | Failure

export function ok<T>(data: T): Result<T> {
    return { success: true, data }
}

export function fail(code: ErrorCode, error: string, fieldErrors?: FieldErrors): Failure {
    return fieldErrors ? { success: false, code, error, fieldErrors } : { success: false, code, error }
}
