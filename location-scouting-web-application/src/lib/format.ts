// Display formatting shared by pages and components. Pure functions so they're safe on server and client.

type SluglineScene = {
    intExt: string | null
    sceneLocation: string
    sceneTimeOfDay: string | null
}

/** INT_EXT → INT/EXT */
export function formatIntExt(intExt: string) {
    return intExt.replace('_', '/')
}

/** Screenplay slugline, e.g. "INT. KITCHEN - DAY". Without INT/EXT only the location is shown. */
export function formatSlugline(scene: SluglineScene) {
    const location = scene.sceneLocation.toUpperCase()
    if (!scene.intExt) return location

    const timeOfDay = scene.sceneTimeOfDay ? ` - ${scene.sceneTimeOfDay.toUpperCase()}` : ''
    return `${formatIntExt(scene.intExt)}. ${location}${timeOfDay}`
}

/** Street, city and province on one line */
export function formatAddress(place: { address: string; city: string; province: string }) {
    return `${place.address}, ${place.city}, ${place.province}`
}

function plural(count: number, unit: string) {
    return `${count} ${unit}${count === 1 ? '' : 's'} ago`
}

/** Relative time for recent dates ("5 mins ago"), falling back to a date after 30 days */
export function formatTimeAgo(date: Date | string, now: Date = new Date()) {
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return plural(minutes, 'min')
    if (hours < 24) return plural(hours, 'hour')
    if (days < 30) return plural(days, 'day')
    return then.toLocaleDateString()
}

/** A 0–1 match score as a whole percentage */
export function toPercent(score: number) {
    return Math.round(score * 100)
}

/** Colour band for a match percentage: strong, fair, or weak */
export function matchStrength(percent: number): 'success' | 'warning' | 'default' {
    if (percent >= 80) return 'success'
    if (percent >= 60) return 'warning'
    return 'default'
}
