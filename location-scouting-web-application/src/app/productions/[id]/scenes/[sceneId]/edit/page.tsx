import { notFound } from 'next/navigation'
import { getSceneById } from '@/app/services/sceneService'
import { getProjectById } from '@/app/services/productionService'
import EditSceneForm from './EditSceneForm'

export default async function EditScenePage({
                                                params,
                                            }: {
    params: Promise<{ id: string; sceneId: string }>
}) {
    const { id: projectId, sceneId } = await params

    const projectResult = await getProjectById(projectId)
    if (!projectResult.success) notFound()

    const sceneResult = await getSceneById(sceneId)
    if (!sceneResult.success) notFound()

    return (
        <EditSceneForm
            scene={sceneResult.data}
            projectId={projectId}
            projectName={projectResult.data.name}
        />
    )
}