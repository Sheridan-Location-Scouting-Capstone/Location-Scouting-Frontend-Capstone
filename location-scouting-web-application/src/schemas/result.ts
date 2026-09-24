export type ErrorCode = 'VALIDATION_FAILED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'LIMIT_EXCEEDED' | 'UNAUTHORIZED';

export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string; code?: ErrorCode; fieldErrors?: Record<string, string[] | undefined> }
