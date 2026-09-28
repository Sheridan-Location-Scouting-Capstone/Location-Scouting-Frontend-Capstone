import { notFound } from 'next/navigation'
import { getProject, getSceneAction } from '@/actions/productionActions'
import PageHeader from '@/components/common/PageHeader'
import SceneForm from '@/components/scenes/SceneForm'

export default async function EditScenePage({ params }: { params: Promise<{ id: string; sceneId: string }> }) {
    const { id: projectId, sceneId } = await params

    const [projectResult, sceneResult] = await Promise.all([getProject(projectId), getSceneAction(sceneId)])
    if (!projectResult.success || !sceneResult.success || sceneResult.data.projectId !== projectId) notFound()
    const scene = sceneResult.data

    return (
        <>
            <PageHeader
                title={`Edit Scene ${scene.sceneNumber}`}
                backHref={`/productions/${projectId}/scenes/${sceneId}`}
                breadcrumbs={[projectResult.data.name, 'Scenes', `Scene ${scene.sceneNumber}`, 'Edit']}
            />
            <SceneForm projectId={projectId} scene={scene} />
        </>
    )
}
