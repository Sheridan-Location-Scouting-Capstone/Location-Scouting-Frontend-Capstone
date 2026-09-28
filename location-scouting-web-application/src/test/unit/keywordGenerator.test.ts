import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getKeywords } from '@/services/keywordGenerator'
import { ErrorCode } from '@/schemas/result'

describe('getKeywords', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.stubEnv('KEYWORD_GENERATION_API_URL', 'http://keywords.test/keywords')
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('should return the generated keywords', async () => {
        // Arrange
        const fetchMock = vi.fn().mockResolvedValue(Response.json(['kitchen', 'interior']))
        vi.stubGlobal('fetch', fetchMock)

        // Act
        const result = await getKeywords('INT. KITCHEN\n  - DAY')

        // Assert
        expect(result).toEqual({ success: true, data: ['kitchen', 'interior'] })
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ scene: 'INT. KITCHEN - DAY' })
    })

    it('should be UNAVAILABLE when no service is configured', async () => {
        // Arrange
        vi.stubEnv('KEYWORD_GENERATION_API_URL', '')
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        // Act
        const result = await getKeywords('INT. KITCHEN - DAY')

        // Assert
        expect(result).toMatchObject({ success: false, code: ErrorCode.UNAVAILABLE })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should be UNAVAILABLE when the service returns an error status', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })))

        expect(await getKeywords('INT. KITCHEN - DAY'))
            .toEqual({ success: false, code: ErrorCode.UNAVAILABLE, error: 'Keyword generation failed with HTTP 503' })
    })

    it('should be UNAVAILABLE when the service cannot be reached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

        expect(await getKeywords('INT. KITCHEN - DAY')).toMatchObject({ success: false, code: ErrorCode.UNAVAILABLE })
    })
})
