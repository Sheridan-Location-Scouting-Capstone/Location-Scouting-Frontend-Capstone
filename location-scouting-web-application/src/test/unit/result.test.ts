import { describe, expect, it } from 'vitest'
import { ERROR_HTTP_STATUS, ErrorCode, fail, ok } from '@/schemas/result'

describe('Result helpers', () => {
    it('should wrap data in a successful Result', () => {
        expect(ok({ id: 1 })).toEqual({ success: true, data: { id: 1 } })
    })

    it('should build a failure with a code and message', () => {
        expect(fail(ErrorCode.NOT_FOUND, 'Location not found'))
            .toEqual({ success: false, code: ErrorCode.NOT_FOUND, error: 'Location not found' })
    })

    it('should include field errors only when given', () => {
        const withFields = fail(ErrorCode.VALIDATION_FAILED, 'Invalid', { name: ['Required'] })
        const withoutFields = fail(ErrorCode.VALIDATION_FAILED, 'Invalid')

        expect(withFields.fieldErrors).toEqual({ name: ['Required'] })
        expect(withoutFields).not.toHaveProperty('fieldErrors')
    })
})

describe('ERROR_HTTP_STATUS', () => {
    it.each(Object.values(ErrorCode))('should map %s to an HTTP error status', (code) => {
        expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400)
        expect(ERROR_HTTP_STATUS[code]).toBeLessThan(600)
    })

    it('should map the codes the app relies on to their conventional statuses', () => {
        expect(ERROR_HTTP_STATUS[ErrorCode.VALIDATION_FAILED]).toBe(400)
        expect(ERROR_HTTP_STATUS[ErrorCode.UNAUTHORIZED]).toBe(401)
        expect(ERROR_HTTP_STATUS[ErrorCode.NOT_FOUND]).toBe(404)
        expect(ERROR_HTTP_STATUS[ErrorCode.INTERNAL_SERVER_ERROR]).toBe(500)
    })
})
