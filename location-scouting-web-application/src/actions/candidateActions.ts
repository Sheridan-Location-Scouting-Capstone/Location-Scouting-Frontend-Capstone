'use server'

import { revalidatePath } from 'next/cache'
import {
    getCandidateById,
    getCandidatesForScene,
    createCandidate,
    removeCandidateFromScene,
    toggleCandidateSelected,
} from '@/services/candidateService'
import {getRecommendations, scoreCandidates} from "@/services/recommendationService";
import {requireUser} from "@/lib/auth-session";
import {ok, Result} from "@/schemas/result";

// ─── Candidates ─────────────────────────────────────────────

export async function getCandidatesAction(sceneId: string) {
    const user = await requireUser()
    return await getCandidatesForScene(user.id, sceneId)
}

export async function getCandidateAction(candidateId: string) {
    const user = await requireUser()
    return await getCandidateById(user.id, candidateId)
}

export async function addCandidateAction(sceneId: string, locationId: string, projectId: string, photoIds: string[]) {
    const user = await requireUser()
    const result = await createCandidate(user.id, {sceneId, locationId, photos: photoIds})
    revalidatePath(`/productions/${projectId}/scenes/${sceneId}`)
    return result
}

export async function removeCandidateAction(candidateId: string, sceneId: string, projectId: string) {
    const user = await requireUser()
    const result = await removeCandidateFromScene(user.id, candidateId)
    revalidatePath(`/productions/${projectId}/scenes/${sceneId}`)
    return result
}

export async function toggleCandidateSelectedAction(
    candidateId: string,
    selected: boolean,
    sceneId: string,
    projectId: string
) {
    const user = await requireUser()
    const result = await toggleCandidateSelected(user.id, candidateId, selected)
    revalidatePath(`/productions/${projectId}/scenes/${sceneId}`)
    return result
}

// Match scores keyed by candidate id. A plain object rather than a Map so it serializes across the server boundary.
export async function scoreCandidatesAction(sceneId: string): Promise<Result<Record<string, number>>> {
    const user = await requireUser()
    const result = await scoreCandidates(user.id, sceneId)
    if (!result.success) return result
    return ok(Object.fromEntries(result.data))
}

export async function getRecommendationsAction(sceneId: string) {
    const user = await requireUser()
    const result = await getRecommendations(user.id, sceneId)
    if(!result.success) return result
    return result
}