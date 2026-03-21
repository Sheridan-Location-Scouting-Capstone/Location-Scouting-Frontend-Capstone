export type KeywordGenerator = (content: string) => Promise<{ success: true, data: string[] } | { success : false }>

export async function getKeywords(content: string): Promise<{ success: true, data: string[] } | { success : false }> {
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
        return { success: false }
    }
}

function sanitizeSceneContent(text: string): string {
    return text.replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}