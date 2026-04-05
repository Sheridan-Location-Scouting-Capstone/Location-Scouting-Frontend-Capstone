import { PhotoUpdateInput } from "../schemas/photoUpdateInput"
import { PhotoUploadInput } from "../schemas/photoUploadInput"

export type KeywordGenerator = (content : string) => Promise<{ success: true, data: string[] } | { success : false, error: string }>
export type PhotoKeywordGenerator = (content : PhotoUploadInput) => Promise<{ success: true, data: string[] } | { success : false, error: string }>

export async function getKeywords(content: string): Promise<{ success: true, data: string[] } | { success : false, error: string }> {
    const url = process.env.KEYWORD_GENERATION_API_URL
    if(!url) {
        console.warn('[KeywordGeneration] No API URL configured')
        return { success: false}
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({scene: sanitizeSceneContent(content)})
        })

        if (!response.ok) {
            console.error(`[KeywordGeneration] API returned ${ response.status }`)
            return { success: false }
        }

        const keywords: string[] = await response.json()
        return { success: true, data: keywords }
    } catch (error) {
        console.warn(`[KeywordGeneration] ${ error instanceof Error ? error.message : 'Unknown Error' } `)
        return { success: false, error: "Failed error" }
    }
}

/* export async function getPhotoKeywords(content: PhotoKeywordGenerator) TODO: (SAMI) */

function sanitizeSceneContent(text: string): string {
    return text.replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}