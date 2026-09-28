import { describe, expect, it } from 'vitest'
import { invariant } from '@/lib/invariant'

describe('invariant', () => {
    it('should do nothing when the condition holds', () => {
        expect(() => invariant(true, 'unused')).not.toThrow()
    })

    it.each([false, null, undefined, 0, ''])('should throw when the condition is %j', (condition) => {
        expect(() => invariant(condition, 'user must be loaded')).toThrow('Invariant failed: user must be loaded')
    })
})
