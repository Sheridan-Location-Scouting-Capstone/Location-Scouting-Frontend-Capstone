import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Result } from '@/schemas/result'

// Every exported function of a domain service must return Promise<Result<...>>, so actions and pages only ever
// handle Results. The type checks below fail `tsc` (and so the build/CI) when a service export breaks that; the
// runtime test makes sure a new service file can't be added without being checked here.

type AnyFunction = (...args: never) => unknown

/** Names of a module's exported functions that don't return Promise<Result<...>> */
type NonResultExports<Module> = {
    [Name in keyof Module]: Module[Name] extends AnyFunction
        ? Module[Name] extends (...args: never) => Promise<Result<unknown>> ? never : Name
        : never
}[keyof Module]

type DomainServices = {
    analyticsService: typeof import('@/services/analyticsService')
    candidateService: typeof import('@/services/candidateService')
    keywordGenerator: typeof import('@/services/keywordGenerator')
    locationPhotoService: typeof import('@/services/locationPhotoService')
    locationService: typeof import('@/services/locationService')
    productionService: typeof import('@/services/productionService')
    recommendationService: typeof import('@/services/recommendationService')
    sceneService: typeof import('@/services/sceneService')
}

// Not domain services: infrastructure adapters, pure scoring maths, and the Result plumbing itself
const EXEMPT = ['geocodingService', 'photoService', 'scoringService', 'serviceResult', 'visionService']

const CHECKED: Record<keyof DomainServices, true> = {
    analyticsService: true,
    candidateService: true,
    keywordGenerator: true,
    locationPhotoService: true,
    locationService: true,
    productionService: true,
    recommendationService: true,
    sceneService: true,
}

describe('Service layer contract', () => {
    it('should return a Result from every exported domain service function', () => {
        expectTypeOf<NonResultExports<DomainServices['analyticsService']>>().toEqualTypeOf<never>()
        expectTypeOf<NonResultExports<DomainServices['candidateService']>>().toEqualTypeOf<never>()
        expectTypeOf<NonResultExports<DomainServices['keywordGenerator']>>().toEqualTypeOf<never>()
        expectTypeOf<NonResultExports<DomainServices['locationPhotoService']>>().toEqualTypeOf<never>()
        expectTypeOf<NonResultExports<DomainServices['locationService']>>().toEqualTypeOf<never>()
        expectTypeOf<NonResultExports<DomainServices['productionService']>>().toEqualTypeOf<never>()
        expectTypeOf<NonResultExports<DomainServices['recommendationService']>>().toEqualTypeOf<never>()
        expectTypeOf<NonResultExports<DomainServices['sceneService']>>().toEqualTypeOf<never>()
    })

    it('should check every service file, or list it as exempt', () => {
        const serviceFiles = readdirSync(path.join(__dirname, '../../services'))
            .filter((file) => file.endsWith('.ts'))
            .map((file) => file.replace(/\.ts$/, ''))

        const unchecked = serviceFiles.filter((name) => !(name in CHECKED) && !EXEMPT.includes(name))

        expect(unchecked).toEqual([])
    })
})
