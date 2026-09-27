export const ErrorCode = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string; code?: ErrorCode; fieldErrors?: Record<string, string[] | undefined> }
