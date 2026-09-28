import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLabelDetector, GOOGLE_VISION_API_URL, labelsFromResponse, visionConfig } from '@/services/visionService'

const image = Buffer.from('fake image')

const annotateResponse = (labels: { description: string; score: number }[]) => ({
    responses: [{ labelAnnotations: labels }],
})

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('labelsFromResponse', () => {
    it('should keep at most three labels scoring at least 0.8, in order', () => {
        const body = annotateResponse([
            { description: 'Building', score: 0.95 },
            { description: 'Sky', score: 0.62 },
            { description: 'Street', score: 0.91 },
            { description: 'Urban area', score: 0.87 },
            { description: 'Window', score: 0.85 },
        ])
        expect(labelsFromResponse(body)).toEqual(['Building', 'Street', 'Urban area'])
    })

    it.each([
        ['an error body', { error: { code: 403, message: 'API key not valid' } }],
        ['an empty response list', { responses: [] }],
        ['a response without labels', { responses: [{}] }],
        ['null', null],
    ])('should return no labels for %s', (_label, body) => {
        expect(labelsFromResponse(body)).toEqual([])
    })
})

describe('visionConfig', () => {
    it('should default to Google with no key', () => {
        expect(visionConfig({})).toEqual({ apiUrl: GOOGLE_VISION_API_URL, apiKey: undefined })
    })

    it('should read a custom endpoint and key, dropping a trailing slash', () => {
        expect(visionConfig({ GOOGLE_VISION_API_URL: 'http://localhost:8089/', GOOGLE_VISION_API: 'k' }))
            .toEqual({ apiUrl: 'http://localhost:8089', apiKey: 'k' })
    })
})

describe('createLabelDetector', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should skip Google entirely when no key is configured', async () => {
        const fetchImpl = vi.fn<typeof fetch>()
        const detect = createLabelDetector({ apiUrl: GOOGLE_VISION_API_URL, apiKey: undefined }, fetchImpl)

        expect(await detect(image)).toEqual([])
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('should send the image to images:annotate with the key and return its labels', async () => {
        // Arrange
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(annotateResponse([{ description: 'Building', score: 0.9 }])))
        const detect = createLabelDetector({ apiUrl: GOOGLE_VISION_API_URL, apiKey: 'secret key' }, fetchImpl)

        // Act
        const labels = await detect(image)

        // Assert
        expect(labels).toEqual(['Building'])
        const [url, init] = fetchImpl.mock.calls[0]
        expect(url).toBe('https://vision.googleapis.com/v1/images:annotate?key=secret%20key')
        const body = JSON.parse(init!.body as string)
        expect(body.requests[0].image.content).toBe(image.toString('base64'))
        expect(body.requests[0].features).toEqual([{ type: 'LABEL_DETECTION', maxResults: 10 }])
    })

    it('should call a mock endpoint without needing a key', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(annotateResponse([])))
        const detect = createLabelDetector({ apiUrl: 'http://localhost:8089', apiKey: undefined }, fetchImpl)

        await detect(image)

        expect(fetchImpl.mock.calls[0][0]).toBe('http://localhost:8089/v1/images:annotate')
    })

    it('should return no labels when Vision responds with an error status', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ error: { message: 'API key not valid' } }, 403))
        const detect = createLabelDetector({ apiUrl: GOOGLE_VISION_API_URL, apiKey: 'bad' }, fetchImpl)

        expect(await detect(image)).toEqual([])
    })

    it('should return no labels when Vision is unreachable', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => { throw new TypeError('fetch failed') })
        const detect = createLabelDetector({ apiUrl: 'http://localhost:8089', apiKey: undefined }, fetchImpl)

        expect(await detect(image)).toEqual([])
    })
})
