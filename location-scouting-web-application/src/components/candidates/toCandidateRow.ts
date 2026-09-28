import type { CandidateWithDetails } from '@/services/candidateService'
import type { CandidateRow } from '@/components/candidates/CandidateTable'

/** Flattens a candidate (with its location and photos) into a table row, attaching its match score if scored */
export function toCandidateRow(candidate: CandidateWithDetails, scores: Record<string, number> | null): CandidateRow {
    const { location } = candidate
    return {
        id: candidate.id,
        selected: candidate.selected,
        thumbnailUrl: candidate.photos[0]?.photo.url ?? null,
        matchScore: scores?.[candidate.id] ?? null,
        location: {
            id: location.id,
            name: location.name,
            address: location.address,
            city: location.city,
            province: location.province,
            keywords: location.keywords,
            latitude: location.latitude,
            longitude: location.longitude,
        },
    }
}
