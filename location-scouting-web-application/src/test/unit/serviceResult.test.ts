import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { ErrorCode, fail, ok } from '@/schemas/result'
import { guard, isRecordNotFound, isUniqueViolation } from '@/services/serviceResult'
import type { Logger } from '@/lib/logger'

const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError('Prisma error', { code, clientVersion: 'test' })

function fakeLogger(): Logger {
    return { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}

describe('guard', () => {
    it('should pass a successful Result through', async () => {
        const logger = fakeLogger()

        const result = await guard(logger, 'load things', async () => ok([1, 2]))

        expect(result).toEqual({ success: true, data: [1, 2] })
        expect(logger.error).not.toHaveBeenCalled()
    })

    it('should pass an expected failure through unchanged', async () => {
        const result = await guard(fakeLogger(), 'load things', async () => fail(ErrorCode.NOT_FOUND, 'Thing not found'))

        expect(result).toEqual({ success: false, code: ErrorCode.NOT_FOUND, error: 'Thing not found' })
    })

    it('should turn an unexpected exception into an INTERNAL_SERVER_ERROR and log it', async () => {
        // Arrange
        const logger = fakeLogger()
        const error = new Error('connection refused')

        // Act
        const result = await guard(logger, 'load things', async () => { throw error })

        // Assert
        expect(result).toEqual({ success: false, code: ErrorCode.INTERNAL_SERVER_ERROR, error: 'Failed to load things' })
        expect(logger.error).toHaveBeenCalledWith('Failed to load things', error)
    })
})

describe('Prisma error checks', () => {
    it('should recognise a record-not-found error', () => {
        expect(isRecordNotFound(prismaError('P2025'))).toBe(true)
        expect(isRecordNotFound(prismaError('P2002'))).toBe(false)
        expect(isRecordNotFound(new Error('P2025'))).toBe(false)
    })

    it('should recognise a unique constraint violation', () => {
        expect(isUniqueViolation(prismaError('P2002'))).toBe(true)
        expect(isUniqueViolation(prismaError('P2025'))).toBe(false)
        expect(isUniqueViolation(undefined)).toBe(false)
    })
})
