import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    createRoutingService,
    estimateDrivingDistance,
    estimateDrivingTime,
    estimateRoute,
    ROUTING_DEFAULTS,
    routingConfig,
} from '@/services/routingService'

// Fixtures follow the real shape of an OSRM table response for
// /table/v1/driving/{origin};{dest};...?sources=0&annotations=duration,distance&generate_hints=false
// Every coordinate (origin included) comes back as a destination, so destination i is column i + 1.

const cnTower = { lat: 43.6426, lng: -79.3871 }
const portLands = { lat: 43.6532, lng: -79.3366 }
const liberty = { lat: 43.6380, lng: -79.4199 }
const montreal = { lat: 45.5017, lng: -73.5673 }

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('routingConfig', () => {
    it('should leave OSRM unset when OSRM_URL is missing', () => {
        expect(routingConfig({})).toEqual({ ...ROUTING_DEFAULTS, osrmUrl: undefined })
    })

    it('should read OSRM_URL, dropping a trailing slash', () => {
        expect(routingConfig({ OSRM_URL: 'http://localhost:5000/' }).osrmUrl).toBe('http://localhost:5000')
    })
})

describe('detour-index estimate', () => {
    it('should multiply the straight-line distance by 1.35 by default', () => {
        expect(estimateDrivingDistance(10)).toBeCloseTo(13.5)
    })

    it('should use a custom multiplier', () => {
        expect(estimateDrivingDistance(10, { multiplier: 1.2 })).toBeCloseTo(12)
    })

    it('should turn a distance into minutes at the average speed', () => {
        expect(estimateDrivingTime(20, 40)).toBeCloseTo(30)
    })

    it('should default to 40 km/h', () => {
        expect(estimateDrivingTime(10)).toBeCloseTo(15)
    })

    it('should estimate a route from the Haversine distance', () => {
        // One degree of latitude along a meridian is 6371 × π / 180 ≈ 111.19 km in a straight line
        const config = { ...ROUTING_DEFAULTS, osrmUrl: undefined }

        const route = estimateRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, config)

        expect(route!.distanceKm).toBeCloseTo(111.19 * 1.35, 1)
        expect(route!.durationMin).toBeCloseTo((111.19 * 1.35 / 40) * 60, 0)
        expect(route!.estimated).toBe(true)
    })
})

describe('createRoutingService', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should map the real OSRM response for three destinations', async () => {
        // Arrange: the response from our OSRM server for CN Tower → Port Lands, Liberty Village, Montreal
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            distances: [[0, 5039.9, 3487.2, 525458]],
            destinations: [
                { distance: 102.4581952, name: 'Bremner Boulevard', location: [-79.386412, 43.641825] },
                { distance: 17.00321716, name: '', location: [-79.336491, 43.653069] },
                { distance: 5.704421899, name: '', location: [-79.419832, 43.638014] },
                { distance: 60414.94185, name: 'Chemin du Haut-de-la-Chute', location: [-74.338844, 45.472727] },
            ],
            durations: [[0, 436.3, 393.4, 22889.3]],
            sources: [{ distance: 102.4581952, name: 'Bremner Boulevard', location: [-79.386412, 43.641825] }],
        }))
        const service = createRoutingService({ config: { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }, fetch: fetchImpl })

        // Act
        const routes = await service.oneToMany(cnTower, [portLands, liberty, montreal])

        // Assert: Montreal is outside the Ontario extract and snaps 60 km away, so it has no route
        expect(routes).toHaveLength(3)
        expect(routes[0]!.distanceKm).toBeCloseTo(5.0399)
        expect(routes[0]!.durationMin).toBeCloseTo(436.3 / 60)
        expect(routes[0]!.estimated).toBe(false)
        expect(routes[1]!.distanceKm).toBeCloseTo(3.4872)
        expect(routes[1]!.durationMin).toBeCloseTo(393.4 / 60)
        expect(routes[1]!.estimated).toBe(false)
        expect(routes[2]).toBeNull()
    })

    it('should send coordinates as lon,lat with the origin first and the table query parameters', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            durations: [[0, 436.3]],
            distances: [[0, 5039.9]],
            sources: [{ distance: 102.5, location: [-79.386412, 43.641825] }],
            destinations: [
                { distance: 102.5, location: [-79.386412, 43.641825] },
                { distance: 17.0, location: [-79.336491, 43.653069] },
            ],
        }))
        const service = createRoutingService({ config: { ...ROUTING_DEFAULTS, osrmUrl: 'http://localhost:5000' }, fetch: fetchImpl })

        await service.oneToMany(cnTower, [portLands])

        expect(fetchImpl.mock.calls[0][0]).toBe(
            'http://localhost:5000/table/v1/driving/-79.3871,43.6426;-79.3366,43.6532'
            + '?sources=0&annotations=duration,distance&generate_hints=false',
        )
    })

    it('should convert seconds to minutes and metres to kilometres', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            durations: [[0, 600]],
            distances: [[0, 12_500]],
            sources: [{ distance: 0, location: [-79.3871, 43.6426] }],
            destinations: [
                { distance: 0, location: [-79.3871, 43.6426] },
                { distance: 0, location: [-79.3366, 43.6532] },
            ],
        }))
        const service = createRoutingService({ config: { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }, fetch: fetchImpl })

        const routes = await service.oneToMany(cnTower, [portLands])

        expect(routes).toEqual([{ durationMin: 10, distanceKm: 12.5, estimated: false }])
    })

    it('should return null for a destination snapped further than the threshold, keeping the others', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            durations: [[0, 600, 900]],
            distances: [[0, 5000, 8000]],
            sources: [{ distance: 10, location: [-79.3871, 43.6426] }],
            destinations: [
                { distance: 10, location: [-79.3871, 43.6426] },
                { distance: 1000.1, location: [-79.3366, 43.6532] },
                { distance: 999, location: [-79.4199, 43.6380] },
            ],
        }))
        const service = createRoutingService({ config: { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }, fetch: fetchImpl })

        const routes = await service.oneToMany(cnTower, [portLands, liberty])

        expect(routes).toEqual([null, { durationMin: 15, distanceKm: 8, estimated: false }])
    })

    it('should use a configured snap threshold', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            durations: [[0, 600]],
            distances: [[0, 5000]],
            sources: [{ distance: 10, location: [-79.3871, 43.6426] }],
            destinations: [
                { distance: 10, location: [-79.3871, 43.6426] },
                { distance: 300, location: [-79.3366, 43.6532] },
            ],
        }))
        const service = createRoutingService({
            config: { ...ROUTING_DEFAULTS, maxSnapDistanceM: 250, osrmUrl: 'http://osrm.test' },
            fetch: fetchImpl,
        })

        expect(await service.oneToMany(cnTower, [portLands])).toEqual([null])
    })

    it('should return null for every destination when the origin is snapped further than the threshold', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            durations: [[0, 600, 900]],
            distances: [[0, 5000, 8000]],
            sources: [{ distance: 60414.9, location: [-74.338844, 45.472727] }],
            destinations: [
                { distance: 60414.9, location: [-74.338844, 45.472727] },
                { distance: 17, location: [-79.3366, 43.6532] },
                { distance: 5, location: [-79.4199, 43.6380] },
            ],
        }))
        const service = createRoutingService({ config: { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }, fetch: fetchImpl })

        const routes = await service.oneToMany(montreal, [portLands, liberty])

        expect(routes).toEqual([null, null])
    })

    it('should return null for a null cell in the matrix without estimating it', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            durations: [[0, null, 900]],
            distances: [[0, null, 8000]],
            sources: [{ distance: 10, location: [-79.3871, 43.6426] }],
            destinations: [
                { distance: 10, location: [-79.3871, 43.6426] },
                { distance: 17, location: [-79.3366, 43.6532] },
                { distance: 5, location: [-79.4199, 43.6380] },
            ],
        }))
        const service = createRoutingService({ config: { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }, fetch: fetchImpl })

        const routes = await service.oneToMany(cnTower, [portLands, liberty])

        expect(routes).toEqual([null, { durationMin: 15, distanceKm: 8, estimated: false }])
    })

    it('should not call OSRM when there are no destinations', async () => {
        const fetchImpl = vi.fn<typeof fetch>()
        const service = createRoutingService({ config: { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }, fetch: fetchImpl })

        expect(await service.oneToMany(cnTower, [])).toEqual([])
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('should estimate every destination without calling OSRM when OSRM_URL is unset', async () => {
        // Arrange
        const fetchImpl = vi.fn<typeof fetch>()
        const config = { ...ROUTING_DEFAULTS, osrmUrl: undefined }
        const service = createRoutingService({ config, fetch: fetchImpl })

        // Act
        const routes = await service.oneToMany(cnTower, [portLands, liberty])

        // Assert
        expect(fetchImpl).not.toHaveBeenCalled()
        expect(routes).toEqual([estimateRoute(cnTower, portLands, config), estimateRoute(cnTower, liberty, config)])
        expect(routes.every((route) => route!.estimated)).toBe(true)
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('OSRM_URL is not set'))
    })

    it('should estimate every destination when OSRM is slower than the timeout', async () => {
        // Arrange: a request that only settles when its abort signal fires
        const fetchImpl = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
            init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason))
        }))
        const config = { ...ROUTING_DEFAULTS, timeoutMs: 20, osrmUrl: 'http://osrm.test' }
        const service = createRoutingService({ config, fetch: fetchImpl })

        // Act
        const routes = await service.oneToMany(cnTower, [portLands])

        // Assert
        expect(routes).toEqual([estimateRoute(cnTower, portLands, config)])
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('timed out after 20 ms'))
    })

    it('should estimate every destination when OSRM is unreachable', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => { throw new TypeError('fetch failed') })
        const config = { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }
        const service = createRoutingService({ config, fetch: fetchImpl })

        const routes = await service.oneToMany(cnTower, [portLands, liberty])

        expect(routes).toEqual([estimateRoute(cnTower, portLands, config), estimateRoute(cnTower, liberty, config)])
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('fetch failed'))
    })

    it('should estimate every destination when OSRM responds with a non-Ok code', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ code: 'InvalidQuery', message: 'Query string malformed close to position 30' }, 400))
        const config = { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }
        const service = createRoutingService({ config, fetch: fetchImpl })

        const routes = await service.oneToMany(cnTower, [portLands])

        expect(routes).toEqual([estimateRoute(cnTower, portLands, config)])
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('InvalidQuery'))
    })

    it('should estimate every destination when OSRM responds with something other than JSON', async () => {
        const fetchImpl = vi.fn<typeof fetch>(async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
        const config = { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }
        const service = createRoutingService({ config, fetch: fetchImpl })

        const routes = await service.oneToMany(cnTower, [portLands])

        expect(routes).toEqual([estimateRoute(cnTower, portLands, config)])
    })

    it('should estimate every destination when an Ok response is missing the distances', async () => {
        // OSRM leaves distances out when annotations=distance isn't honoured
        const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({
            code: 'Ok',
            durations: [[0, 600]],
            sources: [{ distance: 10, location: [-79.3871, 43.6426] }],
            destinations: [
                { distance: 10, location: [-79.3871, 43.6426] },
                { distance: 17, location: [-79.3366, 43.6532] },
            ],
        }))
        const config = { ...ROUTING_DEFAULTS, osrmUrl: 'http://osrm.test' }
        const service = createRoutingService({ config, fetch: fetchImpl })

        const routes = await service.oneToMany(cnTower, [portLands])

        expect(routes).toEqual([estimateRoute(cnTower, portLands, config)])
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('malformed'))
    })
})
