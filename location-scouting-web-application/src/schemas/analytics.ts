// Production analytics data shapes, shared by analyticsService, analyticsActions and the analytics components.

/** Summary stats for the stat card row */
export type AnalyticsSummary = {
    totalScenes: number
    intCount: number
    extCount: number
    intExtCount: number
    scenesWithCandidates: number
    scenesWithSelected: number
    uniqueKeywords: number
    matchedKeywords: number
    unmatchedKeywords: number
}

/** A single coordinate for the heat map */
export type LocationPoint = {
    latitude: number
    longitude: number
}

/** Scene coverage breakdown */
export type SceneCoverage = {
    selected: number       // scenes with at least one selected candidate
    candidateOnly: number  // scenes with candidates but none selected
    noCandidates: number   // scenes with zero candidates
}

/** A keyword that appears in scenes but has no matching location */
export type KeywordGap = {
    keyword: string
    sceneCount: number  // how many scenes use this keyword
}

/** A keyword and how often it appears across scenes */
export type KeywordFrequency = {
    keyword: string
    sceneCount: number
}

/** Everything the analytics dashboard renders for one production */
export type ProductionAnalytics = {
    summary: AnalyticsSummary
    locationPoints: LocationPoint[]
    sceneCoverage: SceneCoverage
    keywordGaps: KeywordGap[]                 // sorted by sceneCount desc
    keywordDistribution: KeywordFrequency[]   // sorted by sceneCount desc, top N only
}
