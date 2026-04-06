import {it, describe, expect} from "vitest";
import {haversineDistance} from "@/app/services/haversineService";


describe('HaversineService', () => {
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
    ])(' should correctly calculate the distance between $from known $to', ({ lat1, lng1, lat2, lng2, expected }) =>{
        const result = haversineDistance(lat1, lng1, lat2, lng2)
        console.log(result)
        expect(result).toBeCloseTo(expected, -1) // within -/+ 5km
    })


})
