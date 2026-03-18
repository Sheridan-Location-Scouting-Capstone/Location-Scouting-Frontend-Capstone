export type KeywordGenerator = (content: string) => Promise<string[]>

export async function getKeywords(content: string): Promise<string[]> {
    const url = process.env.KEYWORD_GENERATION_API_URL
    if(!url) {
        throw new Error('No url set for keyword generation API')
    }

    const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ scene: sanitizeSceneContent(content) })
    })

    if(!response.ok) {
        throw new Error(`Failed to get keyword for ${content}`)
    }

    return await response.json()
}

function sanitizeSceneContent(text: string): string {
    return text.replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}