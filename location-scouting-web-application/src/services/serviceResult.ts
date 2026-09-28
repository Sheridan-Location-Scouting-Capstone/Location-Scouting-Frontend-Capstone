import { Prisma } from '@prisma/client'
import { ErrorCode, fail, Result } from '@/schemas/result'
import { Logger } from '@/lib/logger'

/**
 * Runs a service operation and turns any unexpected exception into an INTERNAL_SERVER_ERROR Result, so callers only
 * ever handle Results. Expected failures (not found, validation, ...) should still be returned explicitly inside.
 */
export async function guard<T>(logger: Logger, operation: string, run: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
        return await run()
    } catch (error) {
        logger.error(`Failed to ${operation}`, error)
        return fail(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to ${operation}`)
    }
}

/** Prisma's "record to update/delete/connect not found" — for us, missing or owned by someone else */
export function isRecordNotFound(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

/** Prisma unique constraint violation */
export function isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
