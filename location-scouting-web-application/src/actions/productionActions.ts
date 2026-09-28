'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {createProject, getProjects, getProjectById, updateProject} from '@/services/productionService'
import {createScene, deleteScene, getSceneById, getScenesForProject, updateScene} from '@/services/sceneService'
import {requireUser} from "@/lib/auth-session";

// ─── Projects ───────────────────────────────────────────────

export async function getProjectsAction() {
  const user = await requireUser();
  const result = await getProjects(user.id);
  if(result.success) {
    return result.data
  }
  throw new Error('Failed to retrieve projects')
}

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const raw = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    province: formData.get('province') as string,
    postalCode: formData.get('postalCode') as string,
    country: (formData.get('country') as string) || 'Canada',
  }

  const result = await createProject(user.id, raw)
  if(!result.success) return result

  revalidatePath('/productions')
  redirect(`/productions/${result.data.id}`)
}


export async function getProject(projectId: string)  {
  const user = await requireUser();
  return await getProjectById(user.id, projectId);
}

// ─── Scenes ─────────────────────────────────────────────────

export async function getSceneAction(sceneId: string) {
  const user = await requireUser();
  return await getSceneById(user.id, sceneId)
}

export async function getScenesAction(projectId: string) {
  const user = await requireUser();
  const result = await getScenesForProject(user.id, projectId)
  if(result.success) {
    return result.data
  }
  throw new Error('Failed to retrieve scenes')
}

export async function createSceneAction(formData: FormData) {
  const user = await requireUser();
  const raw = {
    sceneNumber: parseInt(formData.get('sceneNumber') as string, 10),
    intExt: formData.get('intExt') as 'INT' | 'EXT' | 'INT_EXT',
    sceneLocation: formData.get('sceneLocation') as string,
    sceneTimeOfDay: formData.get('sceneTimeOfDay') as string,
    scriptSection: formData.get('scriptSection') as string,
    projectId: formData.get('projectId') as string,
  }

  const result = await createScene(user.id, raw)
  if(!result.success) return result

  revalidatePath(`/productions/${raw.projectId}`)
  redirect(`/productions/${raw.projectId}`)
}

export async function deleteSceneAction(sceneId: string, projectId: string) {
  const user = await requireUser();
  const result = await deleteScene(user.id, sceneId)
  if(!result.success) return result

  revalidatePath(`/productions/${projectId}`)
  redirect(`/productions/${projectId}`)
}

export async function updateSceneAction(sceneId: string, projectId: string, formData: FormData) {
  const user = await requireUser();
  const raw = {
    sceneNumber: parseInt(formData.get('sceneNumber') as string, 10),
    intExt: formData.get('intExt') as 'INT' | 'EXT' | 'INT_EXT',
    sceneLocation: formData.get('sceneLocation') as string,
    sceneTimeOfDay: formData.get('sceneTimeOfDay') as string,
    scriptSection: formData.get('scriptSection') as string,
    keywords: JSON.parse(formData.get('keywords') as string || '[]'),
    projectId,
  }

  const result = await updateScene(user.id, sceneId, raw)
  if(!result.success) return result

  revalidatePath(`/productions/${projectId}/scenes/${sceneId}`)
  redirect(`/productions/${projectId}/scenes/${sceneId}`)
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  const raw = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    province: formData.get('province') as string,
    postalCode: formData.get('postalCode') as string,
    country: (formData.get('country') as string) || 'Canada',
  }

  const result = await updateProject(user.id, projectId, raw)
  if(!result.success) return result

  revalidatePath(`/productions/${projectId}`)
  redirect(`/productions/${projectId}`)
}
