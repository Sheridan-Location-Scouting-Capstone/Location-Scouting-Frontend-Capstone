import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger } from '@/lib/logger'

describe('createLogger', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it.each(['error', 'warn', 'info'] as const)('should prefix %s messages with the scope', (level) => {
        // Arrange
        const spy = vi.spyOn(console, level).mockImplementation(() => {})

        // Act
        createLogger('locationService')[level]('Something happened')

        // Assert
        expect(spy).toHaveBeenCalledWith('[locationService] Something happened')
    })

    it('should include the name, message and stack of an Error detail', () => {
        // Arrange
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const error = new TypeError('bad input')

        // Act
        createLogger('scope').error('Failed', error)

        // Assert
        expect(spy).toHaveBeenCalledWith('[scope] Failed', { name: 'TypeError', message: 'bad input', stack: error.stack })
    })

    it('should pass other details through as they are', () => {
        // Arrange
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        // Act
        createLogger('scope').warn('Odd response', { status: 502 })

        // Assert
        expect(spy).toHaveBeenCalledWith('[scope] Odd response', { status: 502 })
    })
})
