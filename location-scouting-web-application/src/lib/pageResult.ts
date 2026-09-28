import { notFound } from 'next/navigation'
import { ErrorCode, type Result } from '@/schemas/result'

/**
 * The data of a Result a page can't render without. NOT_FOUND shows the 404 page (it also covers records owned by
 * another user); any other failure is thrown so the nearest error.tsx boundary shows it.
 */
export function unwrapForPage<T>(result: Result<T>): T {
    if (result.success) return result.data
    if (result.code === ErrorCode.NOT_FOUND) notFound()
    throw new Error(result.error)
}
