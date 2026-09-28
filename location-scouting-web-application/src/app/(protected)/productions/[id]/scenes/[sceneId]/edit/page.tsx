import { notFound } from 'next/navigation'
import { getProject, getSceneAction } from '@/actions/productionActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'
import SceneForm from '@/components/scenes/SceneForm'

export default async function EditScenePage({ params }: { params: Promise<{ id: string; sceneId: string }> }) {
    const { id: projectId, sceneId } = await params

    const [projectResult, sceneResult] = await Promise.all([getProject(projectId), getSceneAction(sceneId)])
    const project = unwrapForPage(projectResult)
    const scene = unwrapForPage(sceneResult)
    // The scene must belong to the production in the URL
    if (scene.projectId !== projectId) notFound()

    return (
        <>
            <PageHeader
                title={`Edit Scene ${scene.sceneNumber}`}
                backHref={`/productions/${projectId}/scenes/${sceneId}`}
                breadcrumbs={[project.name, 'Scenes', `Scene ${scene.sceneNumber}`, 'Edit']}
            />
            <SceneForm projectId={projectId} scene={scene} />
        </>
    )
}
