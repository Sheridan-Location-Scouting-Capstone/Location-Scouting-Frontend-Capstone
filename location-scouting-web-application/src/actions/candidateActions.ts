'use server'

import { revalidatePath } from 'next/cache'
import {
    getCandidatesForScene,
    createCandidate,
    removeCandidateFromScene,
    toggleCandidateSelected,
} from '@/services/candidateService'
import {getRecommendations} from "@/services/recommendationService";
import {requireUser} from "@/lib/auth-session";

// ─── Candidates ─────────────────────────────────────────────

export async function getCandidatesAction(sceneId: string) {
    const user = await requireUser()
    return await getCandidatesForScene(user.id, sceneId)
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

export async function getRecommendationsAction(sceneId: string) {
    const user = await requireUser()
    const result = await getRecommendations(user.id, sceneId)
    return result
}