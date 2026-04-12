// ──────────────────────────────────────
// Types — analytics.types.ts
// ──────────────────────────────────────

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
    selected: number    // scenes with at least one selected candidate
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

// ──────────────────────────────────────
// Component Props
// ──────────────────────────────────────

/** Top-level dashboard — receives everything, composes panels */
export type AnalyticsDashboardProps = {
    projectName: string
    projectId: string
    summary: AnalyticsSummary
    locationPoints: LocationPoint[]
    sceneCoverage: SceneCoverage
    keywordGaps: KeywordGap[]           // pre-sorted by sceneCount desc
    keywordDistribution: KeywordFrequency[]  // pre-sorted, top N only
}

/** The four stat cards */
export type StatCardsProps = {
    summary: AnalyticsSummary
}

/** Sami's heat map — already defined, just reused */
// <LocationHeatMap locations={LocationPoint[]} />

/** Stacked horizontal bar */
export type SceneCoverageChartProps = {
    coverage: SceneCoverage
}

/** The gap list (not a chart anymore) */
export type KeywordGapPanelProps = {
    gaps: KeywordGap[]  // empty array = all-clear state
}

/** Horizontal bar chart, top N keywords */
export type KeywordDistributionChartProps = {
    distribution: KeywordFrequency[]
}