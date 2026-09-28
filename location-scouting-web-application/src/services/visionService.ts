// Photo label detection with the Google Vision REST API.
//
// Labels are a nice-to-have (they become location keyword suggestions), so detection is best-effort: when Vision
// isn't configured, is unreachable, or returns an error, it yields no labels and the photo upload carries on.
//
// Configuration (.env):
//   GOOGLE_VISION_API      API key. Required for the real Google endpoint; optional for a mock.
//   GOOGLE_VISION_API_URL  Base URL. Defaults to Google; point it at a mock server (see mocks/README.md) to run
//                          without a key or to get deterministic labels in tests.

export type LabelDetector = (image: Buffer) => Promise<string[]>

export const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com'
export const MIN_LABEL_SCORE = 0.8
export const MAX_LABELS = 3
const REQUEST_TIMEOUT_MS = 10_000

type VisionConfig = { apiUrl: string; apiKey: string | undefined }

export function visionConfig(env: Record<string, string | undefined> = process.env): VisionConfig {
    return {
        apiUrl: (env.GOOGLE_VISION_API_URL || GOOGLE_VISION_API_URL).replace(/\/+$/, ''),
        apiKey: env.GOOGLE_VISION_API || undefined,
    }
}

type LabelAnnotation = { description?: string; score?: number }

/** The top confident labels from an images:annotate response. Anything malformed yields no labels. */
export function labelsFromResponse(body: unknown): string[] {
    const annotations = (body as { responses?: { labelAnnotations?: LabelAnnotation[] }[] } | null)
        ?.responses?.[0]?.labelAnnotations
    if (!Array.isArray(annotations)) return []

    return annotations
        .filter((label) => typeof label.description === 'string' && (label.score ?? 0) >= MIN_LABEL_SCORE)
        .slice(0, MAX_LABELS)
        .map((label) => label.description as string)
}

export function createLabelDetector(config: VisionConfig = visionConfig(), fetchImpl: typeof fetch = fetch): LabelDetector {
    return async (image) => {
        if (config.apiUrl === GOOGLE_VISION_API_URL && !config.apiKey) {
            console.warn('[Vision] GOOGLE_VISION_API is not set; skipping photo label detection')
            return []
        }

        const query = config.apiKey ? `?key=${encodeURIComponent(config.apiKey)}` : ''
        try {
            const response = await fetchImpl(`${config.apiUrl}/v1/images:annotate${query}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                body: JSON.stringify({
                    requests: [{
                        image: { content: image.toString('base64') },
                        features: [{ type: 'LABEL_DETECTION', maxResults: 10 }],
                    }],
                }),
            })

            if (!response.ok) {
                console.warn(`[Vision] Label detection failed with HTTP ${response.status}`)
                return []
            }
            return labelsFromResponse(await response.json())
        } catch (error) {
            console.warn(`[Vision] Label detection failed: ${error instanceof Error ? error.message : 'unknown error'}`)
            return []
        }
    }
}

/** Reads the configuration on each call so changes to the environment (e.g. in tests) take effect */
export const detectLabels: LabelDetector = (image) => createLabelDetector()(image)
