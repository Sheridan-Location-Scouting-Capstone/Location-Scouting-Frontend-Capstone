import {it, describe, expect} from "vitest";
import {
    calculateProximityScore,
    DEFAULT_MAX_DISTANCE_KM, DEFAULT_MIN_DISTANCE_KM,
    haversineDistance,
    MAX_PROXIMITY_SCORE, MIN_PROXIMITY_SCORE
} from "@/services/scoringService";

describe('Scoring Service ', () => {
    describe('proximityScore', () => {
        // Used for reference/source-of-truth: https://www.distancecalculator.net/from-toronto-to-ottawa
        // Toronto: https://www.latlong.net/place/toronto-on-canada-27230.html
        // Ottawa: https://www.latlong.net/place/ottawa-on-canada-29260.html
        it.each([
            {
                from: 'Toronto',
                to: 'Ottawa',
                lat1: 43.651070, lng1: -79.347015,
                lat2: 45.424721, lng2: -75.695000,
                expected: 351
            },
            {
                from: 'Toronto',
                to: 'Toronto',
                lat1: 43.651070, lng1: -79.347015,
                lat2: 43.651070, lng2: -79.347015,
                expected: 0
            },
            {
                from: 'Toronto',
                to: 'Toronto\'s Antipodal Point',
                lat1: 43.651070, lng1: -79.3470,
                lat2: -43.651070, lng2: 100.6530,
                expected: 20015
            }
        ])(' should correctly calculate the distance between $from known $to', ({lat1, lng1, lat2, lng2, expected}) => {
            const result = haversineDistance(lat1, lng1, lat2, lng2)
            console.log(result)
            expect(result).toBeCloseTo(expected, -1) // within -/+ 5km
        })

        describe('Proximity Score Calculation', () => {
            it.each([
                {
                    // Minimum (0.3 currently or 300 meters. This is walking distance, essentially)
                    distance: DEFAULT_MIN_DISTANCE_KM,
                    expected: MAX_PROXIMITY_SCORE
                },
                {
                    // Halfway
                    distance: (DEFAULT_MAX_DISTANCE_KM + DEFAULT_MIN_DISTANCE_KM) / 2,
                    expected: 0.5
                },
                {
                    // Maximum (100 km currently)
                    distance: DEFAULT_MAX_DISTANCE_KM,
                    expected: MIN_PROXIMITY_SCORE
                },
                {
                    // Over Maximum
                    distance: DEFAULT_MAX_DISTANCE_KM + 0.01,
                    expected: MIN_PROXIMITY_SCORE
                },
                {
                    // Under Minimum
                    distance: DEFAULT_MIN_DISTANCE_KM - 0.01,
                    expected: MAX_PROXIMITY_SCORE
                }
            ])(' should score $expected on location within $distance km', ({distance, expected}) => {
                // Act
                const result: number = calculateProximityScore(distance)

                // Assert
                expect(result).toBeDefined()
                expect(result).toEqual(expected)
            })
        })
    })
})
