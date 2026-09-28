import path from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { prisma } from '@/test/setup'
import { createLabelDetector } from '@/services/visionService'
import { getKeywords } from '@/services/keywordGenerator'
import { createLocation, defaultGeocoder } from '@/services/locationService'
import { addPhotosToLocation } from '@/services/locationPhotoService'
import { signUpSetup } from '@/test/e2e/fixtures'
import { expectSuccess } from '@/test/helpers/result'
import { buildLocationInput } from '@/test/helpers/builders'

// Contract test for the WireMock stubs in mocks/wiremock: runs the same container docker-compose uses and calls it
// through the app's real clients, so the stubs can't drift from what the code expects.

const MOCKS_DIR = path.resolve(__dirname, '../../../mocks/wiremock')
const ENV_KEYS = ['GOOGLE_VISION_API', 'GOOGLE_VISION_API_URL', 'KEYWORD_GENERATION_API_URL', 'NOMINATIM_API_URL'] as const

describe('External service mocks (WireMock)', () => {
    let container: StartedTestContainer
    let baseUrl: string
    const savedEnv: Partial<Record<typeof ENV_KEYS[number], string>> = {}

    beforeAll(async () => {
        container = await new GenericContainer('wiremock/wiremock:3.13.1')
            .withCopyDirectoriesToContainer([{ source: MOCKS_DIR, target: '/home/wiremock' }])
            .withCommand(['--disable-banner'])
            .withExposedPorts(8080)
            .withWaitStrategy(Wait.forHttp('/__admin/health', 8080))
            .start()
        baseUrl = `http://${container.getHost()}:${container.getMappedPort(8080)}`
    }, 120_000)

    afterAll(async () => {
        await container?.stop()
    })

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

    describe('Google Vision', () => {
        it('should return the canned labels that pass the score threshold', async () => {
            const detect = createLabelDetector({ apiUrl: baseUrl, apiKey: undefined })
            expect(await detect(Buffer.from('image'))).toEqual(['Building', 'Street', 'Urban area'])
        })

        it('should yield no labels during a simulated outage', async () => {
            const detect = createLabelDetector({ apiUrl: `${baseUrl}/unavailable`, apiKey: undefined })
            expect(await detect(Buffer.from('image'))).toEqual([])
        })

        it('should feed the labels into location keywords when configured through the environment', async () => {
            // Arrange
            process.env.GOOGLE_VISION_API_URL = baseUrl
            delete process.env.GOOGLE_VISION_API
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
