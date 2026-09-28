import { describe, expect, it, vi } from 'vitest'
import { notFound } from 'next/navigation'
import { ErrorCode, fail, ok } from '@/schemas/result'
import { unwrapForPage } from '@/lib/pageResult'

vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }) }))

describe('unwrapForPage', () => {
    it('should return the data of a successful Result', () => {
        expect(unwrapForPage(ok({ id: 'loc-1' }))).toEqual({ id: 'loc-1' })
    })

    it('should show the 404 page for NOT_FOUND', () => {
        expect(() => unwrapForPage(fail(ErrorCode.NOT_FOUND, 'Location not found'))).toThrow('NEXT_NOT_FOUND')
        expect(notFound).toHaveBeenCalled()
    })

    it.each([ErrorCode.INTERNAL_SERVER_ERROR, ErrorCode.UNAVAILABLE, ErrorCode.VALIDATION_FAILED])(
        'should throw %s to the error boundary instead of showing a 404',
        (code) => {
            vi.mocked(notFound).mockClear()

            expect(() => unwrapForPage(fail(code, 'Failed to get locations'))).toThrow('Failed to get locations')
            expect(notFound).not.toHaveBeenCalled()
        }
    )
})
