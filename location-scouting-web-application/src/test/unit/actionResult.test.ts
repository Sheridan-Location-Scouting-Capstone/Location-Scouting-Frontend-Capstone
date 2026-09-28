import { describe, expect, it } from 'vitest'
import { fieldError, fieldErrorProps, isActionFailure } from '@/lib/actionResult'
import { ErrorCode } from '@/schemas/result'

describe('isActionFailure', () => {
    it('should recognise a failed Result', () => {
        expect(isActionFailure({ success: false, error: 'nope' })).toBe(true)
    })

    it.each([
        ['a successful Result', { success: true, data: 1 }],
        ['undefined (an action that redirected)', undefined],
        ['null', null],
        ['a plain value', 'failure'],
    ])('should not treat %s as a failure', (_label, value) => {
        expect(isActionFailure(value)).toBe(false)
    })
})

describe('field errors', () => {
    const failure = {
        success: false as const,
        code: ErrorCode.VALIDATION_FAILED,
        error: 'Invalid',
        fieldErrors: { name: ['Name is required', 'Too short'], city: undefined },
    }

    it('should return the first message for a field', () => {
        expect(fieldError(failure, 'name')).toBe('Name is required')
    })

    it('should return nothing for fields without errors', () => {
        expect(fieldError(failure, 'city')).toBeUndefined()
        expect(fieldError(null, 'name')).toBeUndefined()
    })

    it('should build TextField props only when the field has an error', () => {
        expect(fieldErrorProps(failure, 'name')).toEqual({ error: true, helperText: 'Name is required' })
        expect(fieldErrorProps(failure, 'address')).toEqual({})
    })
})
