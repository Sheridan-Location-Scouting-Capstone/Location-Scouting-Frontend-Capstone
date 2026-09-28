import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/test/setup'
import { EXTERNAL_MOCKS_URL, externalServiceMocksEnabled } from '@/test/containers'
import { createLabelDetector } from '@/services/visionService'
import { getKeywords } from '@/services/keywordGenerator'
import { createLocation, defaultGeocoder } from '@/services/locationService'
import { addPhotosToLocation } from '@/services/locationPhotoService'
import { signUpSetup } from '@/test/e2e/fixtures'
import { expectSuccess } from '@/test/helpers/result'
import { buildLocationInput } from '@/test/helpers/builders'

// Contract test for the WireMock stubs in mocks/wiremock, using the mock container the test run already started
// (src/test/containers.ts). Calls go through the app's real clients, so the stubs can't drift from what the code
// expects.

const ENV_KEYS = ['GOOGLE_VISION_API', 'GOOGLE_VISION_API_URL', 'KEYWORD_GENERATION_API_URL', 'NOMINATIM_API_URL'] as const

describe.skipIf(!externalServiceMocksEnabled())('External service mocks (WireMock)', () => {
    const baseUrl = EXTERNAL_MOCKS_URL
    const savedEnv: Partial<Record<typeof ENV_KEYS[number], string>> = {}

    beforeEach(() => {
        ENV_KEYS.forEach((key) => { savedEnv[key] = process.env[key] })
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        ENV_KEYS.forEach((key) => {
            if (savedEnv[key] === undefined) delete process.env[key]
            else process.env[key] = savedEnv[key]
        })
        vi.restoreAllMocks()
    })

    it('should be what the test run routes every external service to', () => {
        expect(process.env.GOOGLE_VISION_API_URL).toBe(baseUrl)
        expect(process.env.GOOGLE_VISION_API).toBe('')
        expect(process.env.KEYWORD_GENERATION_API_URL).toBe(`${baseUrl}/keywords`)
        expect(process.env.NOMINATIM_API_URL).toBe(baseUrl)
    })

    describe('Google Vision', () => {
        it('should return the canned labels that pass the score threshold', async () => {
            const detect = createLabelDetector({ apiUrl: baseUrl, apiKey: undefined })
            expect(await detect(Buffer.from('image'))).toEqual(['Building', 'Street', 'Urban area'])
        })

        it('should yield no labels during a simulated outage', async () => {
            const detect = createLabelDetector({ apiUrl: `${baseUrl}/unavailable`, apiKey: undefined })
            expect(await detect(Buffer.from('image'))).toEqual([])
        })

        it('should feed the labels into location keywords with the default detector', async () => {
            // Arrange
            const userId = (await signUpSetup()).userId
            const location = expectSuccess(await createLocation(userId, buildLocationInput(), { db: prisma, geocoder: async () => null }))

            // Act - default label detector, configured only through env
            expectSuccess(await addPhotosToLocation(userId, location.id, [
                { buffer: Buffer.from('image'), filename: 'street.jpg', mimeType: 'image/jpeg' },
            ], { db: prisma }))

            // Assert
            const saved = await prisma.location.findUnique({ where: { id: location.id } })
            expect(saved!.keywords).toEqual(['Building', 'Street', 'Urban area'])
        })
    })

    describe('Scene keyword generation', () => {
        it('should return the canned keywords', async () => {
            process.env.KEYWORD_GENERATION_API_URL = `${baseUrl}/keywords`
            expect(await getKeywords('INT. KITCHEN - DAY')).toEqual({ success: true, data: ['house', 'backyard', 'interior'] })
        })

        it('should fail gracefully during a simulated outage', async () => {
            process.env.KEYWORD_GENERATION_API_URL = `${baseUrl}/unavailable/keywords`
            expect((await getKeywords('INT. KITCHEN - DAY')).success).toBe(false)
        })
    })

    describe('Nominatim geocoding', () => {
        it('should geocode every address to downtown Toronto', async () => {
            process.env.NOMINATIM_API_URL = baseUrl
            expect(await defaultGeocoder('1 Anywhere St')).toEqual({ lat: 43.6532, lng: -79.3832 })
        })

        it('should reject during a simulated outage, so callers clear stale coordinates', async () => {
            process.env.NOMINATIM_API_URL = `${baseUrl}/unavailable`
            await expect(defaultGeocoder('1 Anywhere St')).rejects.toThrow()
        })
    })
})
