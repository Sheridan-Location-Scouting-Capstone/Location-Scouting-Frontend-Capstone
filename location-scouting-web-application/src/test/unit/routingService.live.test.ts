import { describe, expect, it } from 'vitest'
import { createRoutingService, routingConfig } from '@/services/routingService'

// Runs against a real OSRM server (LS-303: OSRM_URL=http://localhost:5000 through the SSH tunnel).
// Skipped when OSRM_URL is unset. Road data changes between extracts, so these assert ranges, not exact values.

describe.runIf(process.env.OSRM_URL)('routingService against live OSRM', () => {
    const cnTower = { lat: 43.6426, lng: -79.3871 }
    const portLands = { lat: 43.6532, lng: -79.3366 }
    const montreal = { lat: 45.5017, lng: -73.5673 }

    it('should route CN Tower to the Port Lands by road', async () => {
        const service = createRoutingService({ config: routingConfig() })

        const [route] = await service.oneToMany(cnTower, [portLands])

        expect(route).not.toBeNull()
        expect(route!.estimated).toBe(false)
        expect(route!.distanceKm).toBeGreaterThan(3)
        expect(route!.distanceKm).toBeLessThan(8)
        expect(route!.durationMin).toBeGreaterThan(2)
        expect(route!.durationMin).toBeLessThan(30)
    })

    it('should return null for Montreal, which snaps far outside the Ontario extract', async () => {
        const service = createRoutingService({ config: routingConfig() })

        const [toPortLands, toMontreal] = await service.oneToMany(cnTower, [portLands, montreal])

        expect(toPortLands!.estimated).toBe(false)
        expect(toMontreal).toBeNull()
    })
})
