import { describe, expect, it } from 'vitest'
import { normalizePlaceName, parseSceneHeading, ParsedHeading } from '@/services/sceneHeadingParser'

describe('parseSceneHeading', () => {
    describe('acceptance criteria (LS-228)', () => {
        it('should split INT. HALVERSON FARMHOUSE - KITCHEN - NIGHT into INT / place / set / time', () => {
            expect(parseSceneHeading('INT. HALVERSON FARMHOUSE - KITCHEN - NIGHT')).toEqual({
                sceneNumber: null,
                intExt: 'INT',
                place: 'HALVERSON FARMHOUSE',
                setName: 'KITCHEN',
                timeOfDay: 'NIGHT',
                modifiers: [],
                confidence: 1,
                warnings: [],
            })
        })

        it('should leave setName null for a bare INT. HALVERSON FARMHOUSE - NIGHT', () => {
            expect(parseSceneHeading('INT. HALVERSON FARMHOUSE - NIGHT')).toEqual({
                sceneNumber: null,
                intExt: 'INT',
                place: 'HALVERSON FARMHOUSE',
                setName: null,
                timeOfDay: 'NIGHT',
                modifiers: [],
                confidence: 1,
                warnings: [],
            })
        })

        it('should read scene 12A and the MOVING modifier from 12A EXT. HIGHWAY 11 - MOVING - NIGHT', () => {
            expect(parseSceneHeading('12A EXT. HIGHWAY 11 - MOVING - NIGHT')).toEqual({
                sceneNumber: '12A',
                intExt: 'EXT',
                place: 'HIGHWAY 11',
                setName: null,
                timeOfDay: 'NIGHT',
                modifiers: ['MOVING'],
                confidence: 1,
                warnings: [],
            })
        })

        it('should read I/E as INT_EXT', () => {
            expect(parseSceneHeading('I/E PICKUP TRUCK - DUSK')).toMatchObject({ intExt: 'INT_EXT', place: 'PICKUP TRUCK' })
        })

        it('should read INT./EXT. as INT_EXT', () => {
            expect(parseSceneHeading('INT./EXT. CAR - DAY')).toMatchObject({ intExt: 'INT_EXT', place: 'CAR' })
        })

        it('should treat en dashes as separators', () => {
            expect(parseSceneHeading('INT. HOSPITAL – ER – DAWN'))
                .toMatchObject({ place: 'HOSPITAL', setName: 'ER', timeOfDay: 'DAWN' })
        })

        it('should treat em dashes as separators', () => {
            expect(parseSceneHeading('INT. DINER — BOOTH — MORNING'))
                .toMatchObject({ place: 'DINER', setName: 'BOOTH', timeOfDay: 'MORNING' })
        })

        it('should handle a missing time of day with a warning', () => {
            expect(parseSceneHeading('EXT. STREET')).toMatchObject({
                place: 'STREET',
                timeOfDay: null,
                warnings: ['No time of day found'],
            })
        })

        it('should return warnings rather than throw for unparseable input', () => {
            const result = parseSceneHeading('lorem ipsum dolor sit amet')

            expect(result.warnings).not.toEqual([])
            expect(result.confidence).toBeLessThan(0.5)
        })
    })

    describe('real-world headings', () => {
        it.each<{ input: string, expected: ParsedHeading }>([
            {
                input: 'INT. CAR (MOVING) - NIGHT',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'CAR',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: ['MOVING'],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'EXT. TORONTO - CN TOWER - DAY',
                expected: {
                    sceneNumber: null,
                    intExt: 'EXT',
                    place: 'TORONTO',
                    setName: 'CN TOWER',
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT/EXT. VAN - DAY',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT_EXT',
                    place: 'VAN',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: '12A  INT. KITCHEN - NIGHT  12A',
                expected: {
                    sceneNumber: '12A',
                    intExt: 'INT',
                    place: 'KITCHEN',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT. HOUSE - LATER',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'HOUSE',
                    setName: null,
                    timeOfDay: 'LATER',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'EXT. STREET',
                expected: {
                    sceneNumber: null,
                    intExt: 'EXT',
                    place: 'STREET',
                    setName: null,
                    timeOfDay: null,
                    modifiers: [],
                    confidence: 0.8,
                    warnings: ['No time of day found'],
                },
            },
            {
                input: 'int. bar - night',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'BAR',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT. HOSPITAL – ER – DAWN',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'HOSPITAL',
                    setName: 'ER',
                    timeOfDay: 'DAWN',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: '',
                expected: {
                    sceneNumber: null,
                    intExt: null,
                    place: null,
                    setName: null,
                    timeOfDay: null,
                    modifiers: [],
                    confidence: 0,
                    warnings: ['Scene heading is empty'],
                },
            },
            {
                input: '   \t  ',
                expected: {
                    sceneNumber: null,
                    intExt: null,
                    place: null,
                    setName: null,
                    timeOfDay: null,
                    modifiers: [],
                    confidence: 0,
                    warnings: ['Scene heading is empty'],
                },
            },
            {
                input: 'lorem ipsum dolor sit amet',
                expected: {
                    sceneNumber: null,
                    intExt: null,
                    place: 'LOREM IPSUM DOLOR SIT AMET',
                    setName: null,
                    timeOfDay: null,
                    modifiers: [],
                    confidence: 0.2,
                    warnings: ['No INT/EXT found', 'No time of day found', "Doesn't look like a scene heading"],
                },
            },
            {
                input: '!!! ???',
                expected: {
                    sceneNumber: null,
                    intExt: null,
                    place: null,
                    setName: null,
                    timeOfDay: null,
                    modifiers: [],
                    confidence: 0,
                    warnings: ['No INT/EXT found', 'No place found', 'No time of day found', "Doesn't look like a scene heading"],
                },
            },
            {
                input: 'I/E PICKUP TRUCK - DUSK',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT_EXT',
                    place: 'PICKUP TRUCK',
                    setName: null,
                    timeOfDay: 'DUSK',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT./EXT. CAR - DAY',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT_EXT',
                    place: 'CAR',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'EXT./INT. GAS STATION - NIGHT',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT_EXT',
                    place: 'GAS STATION',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT. DINER — BOOTH — MORNING',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'DINER',
                    setName: 'BOOTH',
                    timeOfDay: 'MORNING',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT.   LAKESIDE    DINER  -   KITCHEN -  NIGHT',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'LAKESIDE DINER',
                    setName: 'KITCHEN',
                    timeOfDay: 'NIGHT',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: "INT. KITCHEN - NIGHT (CONT'D)",
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'KITCHEN',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: ["CONT'D"],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'Int. Kitchen – Night (Cont’d)',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'KITCHEN',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: ["CONT'D"],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'EXT. CEMETERY - NIGHT - FLASHBACK',
                expected: {
                    sceneNumber: null,
                    intExt: 'EXT',
                    place: 'CEMETERY',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: ['FLASHBACK'],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: '45 INT. POLICE STATION - INTERROGATION ROOM - CONTINUOUS 45',
                expected: {
                    sceneNumber: '45',
                    intExt: 'INT',
                    place: 'POLICE STATION',
                    setName: 'INTERROGATION ROOM',
                    timeOfDay: 'CONTINUOUS',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'A12 EXT. BACKYARD - DAY A12',
                expected: {
                    sceneNumber: 'A12',
                    intExt: 'EXT',
                    place: 'BACKYARD',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: '12 INT. OFFICE - DAY 13',
                expected: {
                    sceneNumber: '12',
                    intExt: 'INT',
                    place: 'OFFICE',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 0.9,
                    warnings: ['Scene numbers differ (12 and 13); using 12'],
                },
            },
            {
                input: 'INT. KITCHEN - DAY 12',
                expected: {
                    sceneNumber: '12',
                    intExt: 'INT',
                    place: 'KITCHEN',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT. HOUSE - UPSTAIRS - BEDROOM - MOMENTS LATER',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'HOUSE',
                    setName: 'UPSTAIRS - BEDROOM',
                    timeOfDay: 'MOMENTS LATER',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INTERIOR CHURCH - SUNSET',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'CHURCH',
                    setName: null,
                    timeOfDay: 'SUNSET',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'KITCHEN - NIGHT',
                expected: {
                    sceneNumber: null,
                    intExt: null,
                    place: 'KITCHEN',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: [],
                    confidence: 0.6,
                    warnings: ['No INT/EXT found'],
                },
            },
            {
                input: 'INT. KITCHEN-NIGHT',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'KITCHEN',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'EXT. TWENTY-FIRST STREET - DAY',
                expected: {
                    sceneNumber: null,
                    intExt: 'EXT',
                    place: 'TWENTY-FIRST STREET',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INT. SUBWAY CAR (MOVING) (FLASHBACK) - NIGHT',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'SUBWAY CAR',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: ['MOVING', 'FLASHBACK'],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: "INT. KITCHEN - NIGHT (CONT'D",
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: 'KITCHEN',
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: ["CONT'D"],
                    confidence: 0.9,
                    warnings: ['Unclosed parenthesis'],
                },
            },
            {
                input: 'EXT. AREA 51',
                expected: {
                    sceneNumber: null,
                    intExt: 'EXT',
                    place: 'AREA 51',
                    setName: null,
                    timeOfDay: null,
                    modifiers: [],
                    confidence: 0.8,
                    warnings: ['No time of day found'],
                },
            },
            {
                input: 'EXT. INTERNATIONAL HOUSE - DAY',
                expected: {
                    sceneNumber: null,
                    intExt: 'EXT',
                    place: 'INTERNATIONAL HOUSE',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
            {
                input: 'INTERNATIONAL HOUSE - DAY',
                expected: {
                    sceneNumber: null,
                    intExt: null,
                    place: 'INTERNATIONAL HOUSE',
                    setName: null,
                    timeOfDay: 'DAY',
                    modifiers: [],
                    confidence: 0.6,
                    warnings: ['No INT/EXT found'],
                },
            },
            {
                input: 'INT. - NIGHT',
                expected: {
                    sceneNumber: null,
                    intExt: 'INT',
                    place: null,
                    setName: null,
                    timeOfDay: 'NIGHT',
                    modifiers: [],
                    confidence: 0.6,
                    warnings: ['No place found'],
                },
            },
            {
                input: 'EXT. ST. MARY’S CHURCH -- GRAVEYARD -- DAWN',
                expected: {
                    sceneNumber: null,
                    intExt: 'EXT',
                    place: "ST. MARY'S CHURCH",
                    setName: 'GRAVEYARD',
                    timeOfDay: 'DAWN',
                    modifiers: [],
                    confidence: 1,
                    warnings: [],
                },
            },
        ])('should parse "$input"', ({ input, expected }) => {
            expect(parseSceneHeading(input)).toEqual(expected)
        })
    })

    it('should never throw, whatever it is given', () => {
        const awkwardInputs = [
            null as unknown as string,
            undefined as unknown as string,
            42 as unknown as string,
            '((((',
            '))))',
            '- - - -',
            '12A',
            'INT.',
            'INT. KITCHEN - '.repeat(500),
        ]

        for (const input of awkwardInputs) {
            expect(() => parseSceneHeading(input)).not.toThrow()
        }
    })

    it('should treat a non-string as empty', () => {
        expect(parseSceneHeading(null as unknown as string)).toMatchObject({ confidence: 0, warnings: ['Scene heading is empty'] })
    })
})

describe('normalizePlaceName', () => {
    it.each([
        { input: '  halverson   farmhouse ', expected: 'HALVERSON FARMHOUSE' },
        { input: '\tLakeside\nDiner', expected: 'LAKESIDE DINER' },
        { input: 'Twenty–First Street', expected: 'TWENTY-FIRST STREET' },
        { input: 'Twenty—First Street', expected: 'TWENTY-FIRST STREET' },
        { input: 'Twenty - First Street', expected: 'TWENTY-FIRST STREET' },
        { input: 'Twenty--First Street', expected: 'TWENTY-FIRST STREET' },
        { input: 'St. Mary’s Church', expected: "ST. MARY'S CHURCH" },
        { input: '-- Barn --', expected: 'BARN' },
        { input: 'HALVERSON FARMHOUSE', expected: 'HALVERSON FARMHOUSE' },
        { input: '', expected: '' },
        { input: '   ', expected: '' },
    ])('should normalize "$input" to "$expected"', ({ input, expected }) => {
        expect(normalizePlaceName(input)).toBe(expected)
    })

    it('should give the same name for differently typed versions of one place', () => {
        expect(normalizePlaceName('lakeside  diner')).toBe(normalizePlaceName('LAKESIDE DINER '))
    })

    it('should return an empty string for a non-string', () => {
        expect(normalizePlaceName(undefined as unknown as string)).toBe('')
    })
})
