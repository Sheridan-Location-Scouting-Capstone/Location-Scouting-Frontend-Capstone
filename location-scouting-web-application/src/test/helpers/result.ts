import { assert } from 'vitest'
import { Result } from '@/schemas/result'

export function expectSuccess<T>(result: Result<T>): T {
    if(!result.success) {
        assert.fail(`Expected success, got: ${result.code ?? 'failure'}: ${result.error ?? 'no error message'}`)
    }
    return result.data;
}

export function expectFailure<T>(result: Result<T>) {
    if(result.success) {
        assert.fail(`Expected failure, got success}`)
    }
    return result
}