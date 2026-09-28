import { describe, expect, it } from 'vitest'
import { formatAddress, formatIntExt, formatSlugline, formatTimeAgo, matchStrength, toPercent } from '@/lib/format'

describe('formatSlugline', () => {
    it('should build INT/EXT, location and time of day into a slugline', () => {
        expect(formatSlugline({ intExt: 'INT', sceneLocation: 'Kitchen', sceneTimeOfDay: 'Day' })).toBe('INT. KITCHEN - DAY')
    })

    it('should render INT_EXT as INT/EXT', () => {
        expect(formatSlugline({ intExt: 'INT_EXT', sceneLocation: 'Car', sceneTimeOfDay: 'Night' })).toBe('INT/EXT. CAR - NIGHT')
    })

    it('should leave out the time of day when there is none', () => {
        expect(formatSlugline({ intExt: 'EXT', sceneLocation: 'Park', sceneTimeOfDay: null })).toBe('EXT. PARK')
    })

    it('should show only the location when there is no INT/EXT', () => {
        expect(formatSlugline({ intExt: null, sceneLocation: 'Park', sceneTimeOfDay: 'Day' })).toBe('PARK')
    })
})

describe('formatIntExt', () => {
    it.each([['INT', 'INT'], ['EXT', 'EXT'], ['INT_EXT', 'INT/EXT']])('should format %s as %s', (input, expected) => {
        expect(formatIntExt(input)).toBe(expected)
    })
})

describe('formatAddress', () => {
    it('should join street, city and province', () => {
        expect(formatAddress({ address: '123 Main St', city: 'Toronto', province: 'ON' })).toBe('123 Main St, Toronto, ON')
    })
})

describe('formatTimeAgo', () => {
    const now = new Date('2026-09-28T12:00:00Z')
    const ago = (ms: number) => new Date(now.getTime() - ms)

    it.each([
        [ago(30_000), 'just now'],
        [ago(60_000), '1 min ago'],
        [ago(5 * 60_000), '5 mins ago'],
        [ago(3_600_000), '1 hour ago'],
        [ago(3 * 3_600_000), '3 hours ago'],
        [ago(86_400_000), '1 day ago'],
        [ago(12 * 86_400_000), '12 days ago'],
    ])('should describe %s as "%s"', (date, expected) => {
        expect(formatTimeAgo(date, now)).toBe(expected)
    })

    it('should fall back to a date after 30 days', () => {
        const old = ago(45 * 86_400_000)
        expect(formatTimeAgo(old, now)).toBe(old.toLocaleDateString())
    })

    it('should accept ISO strings as well as dates', () => {
        expect(formatTimeAgo(ago(2 * 3_600_000).toISOString(), now)).toBe('2 hours ago')
    })
})

describe('match score helpers', () => {
    it('should round a 0–1 score to a whole percentage', () => {
        expect(toPercent(0.876)).toBe(88)
    })

    it.each([[80, 'success'], [79, 'warning'], [60, 'warning'], [59, 'default']] as const)('should rate %i%% as %s', (percent, strength) => {
        expect(matchStrength(percent)).toBe(strength)
    })
})
