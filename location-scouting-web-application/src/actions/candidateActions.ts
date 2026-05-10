'use server'

import { revalidatePath } from 'next/cache'
import {
    getCandidatesForScene,
    createCandidate,
    removeCandidateFromScene,
    toggleCandidateSelected,
} from '@/services/candidateService'
import {getRecommendations} from "@/services/recommendationService";

// ─── Candidates ─────────────────────────────────────────────

export async function getCandidatesAction(sceneId: string) {
    return await getCandidatesForScene(sceneId)
}

export async function addCandidateAction(sceneId: string, locationId: string, projectId: string, photoIds: string[]) {
    // TODO: Connect to candidateService.addCandidateToScene
    const result = await createCandidate({sceneId, locationId, photos: photoIds})
    revalidatePath(`/productions/${projectId}/scenes/${sceneId}`)
    return result
}

export async function removeCandidateAction(candidateId: string, sceneId: string, projectId: string) {
    // TODO: Connect to candidateService.removeCandidateFromScene
    const result = await removeCandidateFromScene(candidateId)
    revalidatePath(`/productions/${projectId}/scenes/${sceneId}`)
    return result
}

export async function toggleCandidateSelectedAction(
    candidateId: string,
    selected: boolean,
    sceneId: string,
    projectId: string
) {
    // TODO: Connect to candidateService.toggleCandidateSelected
    const result = await toggleCandidateSelected(candidateId, selected)
    revalidatePath(`/productions/${projectId}/scenes/${sceneId}`)
    return result
}

export async function getRecommendationsAction(sceneId: string) {
    const result = await getRecommendations(sceneId)
    return result
}