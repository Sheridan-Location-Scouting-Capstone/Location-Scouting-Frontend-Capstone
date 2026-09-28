import { ErrorCode, fail, ok, Result } from '@/schemas/result'
import { createLogger } from '@/lib/logger'

const logger = createLogger('keywordGenerator')

export type KeywordGenerator = (content: string) => Promise<Result<string[]>>

/** Scene keyword suggestions from the BERT keyword-generation service (KEYWORD_GENERATION_API_URL) */
export async function getKeywords(content: string): Promise<Result<string[]>> {
    const url = process.env.KEYWORD_GENERATION_API_URL
    if (!url) {
        logger.warn('No API URL configured; skipping keyword generation')
        return fail(ErrorCode.UNAVAILABLE, 'Keyword generation is not configured')
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scene: sanitizeSceneContent(content) })
        })

        if (!response.ok) {
            logger.error(`Keyword service returned HTTP ${response.status}`)
            return fail(ErrorCode.UNAVAILABLE, `Keyword generation failed with HTTP ${response.status}`)
        }

        const keywords: string[] = await response.json()
        return ok(keywords)
    } catch (error) {
        logger.warn('Keyword service request failed', error)
        return fail(ErrorCode.UNAVAILABLE, 'Keyword generation is unavailable')
    }
}

function sanitizeSceneContent(text: string): string {
    return text.replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}
