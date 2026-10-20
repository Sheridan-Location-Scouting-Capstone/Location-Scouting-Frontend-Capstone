import type { IntExt } from '@prisma/client'

/** A scene heading (slugline) split into its parts; see parseSceneHeading */
export type ParsedHeading = {
    /** e.g. "12", "12A", "A12"; read from either side of the heading */
    sceneNumber: string | null
    intExt: IntExt | null
    /** First location segment, e.g. "HALVERSON FARMHOUSE" */
    place: string | null
    /** Remaining location segments joined with " - ", e.g. "KITCHEN"; null for a bare heading */
    setName: string | null
    /** Only set when the last segment is a known time token (DAY, NIGHT, CONTINUOUS, ...) */
    timeOfDay: string | null
    /** Parentheticals and known modifier segments, in order, e.g. ["MOVING", "CONT'D"] */
    modifiers: string[]
    /** 0 (nothing usable) to 1 (every part recognised) */
    confidence: number
    /** One message per guessed or missing part */
    warnings: string[]
}

const TIMES_OF_DAY = new Set([
    'DAY', 'NIGHT', 'DAWN', 'DUSK', 'MORNING', 'AFTERNOON', 'EVENING', 'NOON', 'MIDDAY', 'MIDNIGHT',
    'SUNRISE', 'SUNSET', 'TWILIGHT', 'MAGIC HOUR', 'GOLDEN HOUR',
    'EARLY MORNING', 'LATE MORNING', 'LATE AFTERNOON', 'EARLY EVENING', 'LATE NIGHT',
    'CONTINUOUS', 'LATER', 'MOMENTS LATER', 'A MOMENT LATER', 'MOMENTS BEFORE', 'SECONDS LATER',
    'SAME', 'SAME TIME', 'SIMULTANEOUS', 'NEXT DAY', 'THE NEXT DAY', 'NEXT MORNING', 'THE NEXT MORNING',
])

/** Shorthands written into the time slot, mapped to the token stored */
const TIME_OF_DAY_ALIASES = new Map([
    ['CONT', 'CONTINUOUS'],
])

/** Modifiers recognised when written as their own dash segment; anything in parentheses is a modifier too */
const MODIFIERS = new Set([
    'MOVING', 'FLASHBACK', 'FLASH BACK', 'END FLASHBACK', 'DREAM', 'DREAM SEQUENCE', 'FANTASY', 'NIGHTMARE',
    'MONTAGE', 'SERIES OF SHOTS', 'INTERCUT', 'SPLIT SCREEN', 'SLOW MOTION', 'ESTABLISHING', 'POV',
    "CONT'D", 'CONTINUED', 'PRESENT DAY', 'BACK TO PRESENT', 'BLACK AND WHITE', 'B&W', 'STOCK FOOTAGE',
    'ARCHIVE FOOTAGE', 'VIDEO', 'NEWS FOOTAGE', 'SUPER', 'TITLE',
])

/** INT/EXT prefix; longer forms first so INT./EXT. isn't read as INT, and INTERNATIONAL isn't read as INT */
const INT_EXT_PREFIX = /^(INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|I\s*\/\s*E|E\s*\/\s*I|INTERIOR|EXTERIOR|INT|EXT)(?:\.|(?=[\s-]|$))/

const SCENE_NUMBER = '(\\d+[A-Z]{0,2}|[A-Z]{1,2}\\d+)'
const LEADING_SCENE_NUMBER = new RegExp(`^${SCENE_NUMBER}\\.?\\s+`)
const TRAILING_SCENE_NUMBER = new RegExp(`(\\s+)${SCENE_NUMBER}\\.?$`)

/** A dash with whitespace on at least one side, or a run of two or more; a lone word-internal hyphen is kept */
const SEGMENT_SEPARATOR = /\s+-+\s*|\s*-+\s+|-{2,}/

/** Stands in for a parenthetical while the heading is split into segments */
const PARENTHETICAL_MARK = '\u0001'

/**
 * Split a scene heading the way scripts write it, e.g. "12A EXT. HIGHWAY 11 - MOVING - NIGHT", into scene
 * number, INT/EXT, place, set, time of day and modifiers. Never throws: anything it can't read is left null
 * and explained in `warnings`, with a lower `confidence`.
 */
export function parseSceneHeading(input: string): ParsedHeading {
    try {
        return parse(typeof input === 'string' ? input : '')
    } catch {
        return emptyHeading(0, ['Could not parse scene heading'])
    }
}

/**
 * Canonical form of a place name for match-or-create: uppercase, straight apostrophes, single spaces, and every
 * dash variant (with or without surrounding spaces) as one tight hyphen, so "Lakeside – Diner" and
 * "LAKESIDE-DINER" match.
 */
export function normalizePlaceName(name: string): string {
    if (typeof name !== 'string') return ''

    return normalizeCharacters(name)
        .replace(/\s+/g, ' ')
        .replace(/\s*[-\u2013]+\s*/g, '-')
        .replace(/^[\s-]+|[\s-]+$/g, '')
}

function parse(input: string): ParsedHeading {
    let text = normalizeCharacters(input)
        .replace(/\s*\u2013\s*/g, ' - ')
        .trim()

    if (!text) return emptyHeading(0, ['Scene heading is empty'])

    const warnings: string[] = []
    let score = 100

    // Scene number before the heading; only taken when INT/EXT follows, so "12 ANGRY MEN" stays a place
    let sceneNumber: string | null = null
    const leading = LEADING_SCENE_NUMBER.exec(text)
    if (leading && INT_EXT_PREFIX.test(text.slice(leading[0].length))) {
        sceneNumber = leading[1]
        text = text.slice(leading[0].length)
    }

    let intExt: IntExt | null = null
    const prefix = INT_EXT_PREFIX.exec(text)
    if (prefix) {
        intExt = toIntExt(prefix[1])
        text = text.slice(prefix[0].length).replace(/^[\s.-]+/, '')
    }

    // Scene number after the heading. Taken when it repeats the leading number, follows a time of day, or is set
    // apart by two or more spaces; otherwise it's part of the name, as in "EXT. HIGHWAY 11"
    const trailing = TRAILING_SCENE_NUMBER.exec(text)
    if (trailing) {
        const [, spacing, number] = trailing
        const before = text.slice(0, trailing.index)
        const lastSegmentBefore = before.split(SEGMENT_SEPARATOR).pop() ?? ''

        if (number === sceneNumber || isTimeOfDay(lastSegmentBefore) || spacing.length >= 2) {
            if (sceneNumber && number !== sceneNumber) {
                warnings.push(`Scene numbers differ (${sceneNumber} and ${number}); using ${sceneNumber}`)
                score -= 10
            }
            sceneNumber ??= number
            text = before
        }
    }

    // Parentheticals become modifiers; a marker keeps their place among the dash segments. An unclosed one runs
    // to the end of the heading
    const parentheticals: string[] = []
    let unclosed = false
    text = text.replace(/\(([^()]*)(\)|$)/g, (_, inner: string, close: string) => {
        if (!close) unclosed = true
        parentheticals.push(inner.replace(/\s+/g, ' ').trim())
        return ` - ${PARENTHETICAL_MARK}${parentheticals.length - 1} - `
    })
    if (/[()]/.test(text)) {
        unclosed = true
        text = text.replace(/[()]/g, ' ')
    }
    if (unclosed) {
        warnings.push('Unclosed parenthesis')
        score -= 10
    }

    const segments = text
        .split(SEGMENT_SEPARATOR)
        .map((segment) => segment.replace(/\s+/g, ' ').trim())
        .filter(Boolean)

    const modifiers: string[] = []
    const locationSegments: string[] = []
    segments.forEach((segment, index) => {
        if (segment.startsWith(PARENTHETICAL_MARK)) {
            const modifier = parentheticals[Number(segment.slice(1))]
            if (modifier) modifiers.push(modifier)
        } else if (index > 0 && MODIFIERS.has(segment)) {
            modifiers.push(segment)
        } else {
            locationSegments.push(segment)
        }
    })

    // "KITCHEN-NIGHT": a time of day joined on by a bare hyphen
    const last = locationSegments.at(-1)
    if (last && !isTimeOfDay(last)) {
        const hyphen = last.lastIndexOf('-')
        if (hyphen > 0 && isTimeOfDay(last.slice(hyphen + 1))) {
            locationSegments.splice(-1, 1, last.slice(0, hyphen), last.slice(hyphen + 1))
        }
    }

    // Only a known token counts as time of day; an unknown last segment is read as part of the location
    let timeOfDay: string | null = null
    if (locationSegments.length > 0 && isTimeOfDay(locationSegments.at(-1)!)) {
        timeOfDay = toTimeOfDay(locationSegments.pop()!)
    }

    const names = locationSegments.map(normalizePlaceName).filter((name) => /[A-Z0-9]/.test(name))
    const place = names[0] ?? null
    const setName = names.length > 1 ? names.slice(1).join(' - ') : null

    if (!intExt) {
        warnings.push('No INT/EXT found')
        score -= 40
    }
    if (!place) {
        warnings.push('No place found')
        score -= 40
    }
    if (!timeOfDay) {
        warnings.push('No time of day found')
        score -= 20
    }
    if (!intExt && !timeOfDay) {
        warnings.push("Doesn't look like a scene heading")
        score = Math.min(score, 20)
    }

    return {
        sceneNumber,
        intExt,
        place,
        setName,
        timeOfDay,
        modifiers,
        confidence: Math.max(score, 0) / 100,
        warnings,
    }
}

function emptyHeading(confidence: number, warnings: string[]): ParsedHeading {
    return {
        sceneNumber: null,
        intExt: null,
        place: null,
        setName: null,
        timeOfDay: null,
        modifiers: [],
        confidence,
        warnings,
    }
}

/** Uppercase, with curly apostrophes straightened, Unicode hyphens as "-" and every longer dash as an en dash */
function normalizeCharacters(text: string): string {
    return text
        .replace(/[\u2018\u2019\u02BC]/g, "'")
        .replace(/[\u2010\u2011]/g, '-')
        .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '\u2013')
        .toUpperCase()
}

function toIntExt(prefix: string): IntExt {
    const compact = prefix.replace(/[\s.]/g, '')
    if (compact.includes('/')) return 'INT_EXT'
    return compact.startsWith('INT') ? 'INT' : 'EXT'
}

function isTimeOfDay(segment: string): boolean {
    const token = segment.replace(/\.$/, '').trim()
    return TIMES_OF_DAY.has(token) || TIME_OF_DAY_ALIASES.has(token)
}

function toTimeOfDay(segment: string): string {
    const token = segment.replace(/\.$/, '').trim()
    return TIME_OF_DAY_ALIASES.get(token) ?? token
}
