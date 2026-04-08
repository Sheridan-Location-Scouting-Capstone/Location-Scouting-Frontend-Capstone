'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {createProject, getProjects, getProjectById, updateProject} from '@/app/services/productionService'
import { createScene, getScenesForProject } from '@/app/services/sceneService'

// ─── Projects ───────────────────────────────────────────────

export async function getProjectsAction() {
  const result = await getProjects()
  return result.data
}

export async function createProjectAction(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    province: formData.get('province') as string,
    postalCode: formData.get('postalCode') as string,
    country: (formData.get('country') as string) || 'Canada',
  }

  const result = await createProject(raw)

  revalidatePath('/productions')
  redirect(`/productions/${result.data!.id}`)
}


export async function getProject(projectId: string)  {
  const result = await getProjectById(projectId)
  return result
}

// ─── Scenes ─────────────────────────────────────────────────

export async function getScenesAction(projectId: string) {
  const result = await getScenesForProject(projectId)
  return result.data
}

export async function createSceneAction(formData: FormData) {
  const raw = {
    sceneNumber: parseInt(formData.get('sceneNumber') as string, 10),
    intExt: formData.get('intExt') as 'INT' | 'EXT' | 'INT_EXT',
    sceneLocation: formData.get('sceneLocation') as string,
    sceneTimeOfDay: formData.get('sceneTimeOfDay') as string,
    scriptSection: formData.get('scriptSection') as string,
    projectId: formData.get('projectId') as string,
  }

  const result = await createScene(raw)

  revalidatePath(`/productions/${raw.projectId}`)
  redirect(`/productions/${raw.projectId}`)
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    province: formData.get('province') as string,
    postalCode: formData.get('postalCode') as string,
    country: (formData.get('country') as string) || 'Canada',
  }

  await updateProject(projectId, raw)

  revalidatePath(`/productions/${projectId}`)
  redirect(`/productions/${projectId}`)
}
