import { notFound } from 'next/navigation'
import { getProject } from '@/actions/productionActions'
import PageHeader from '@/components/common/PageHeader'
import SceneForm from '@/components/scenes/SceneForm'

export default async function NewScenePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params

    const projectResult = await getProject(projectId)
    if (!projectResult.success) notFound()

    return (
        <>
            <PageHeader
                title="Add New Scene"
                backHref={`/productions/${projectId}`}
                breadcrumbs={[projectResult.data.name, 'Scenes', 'New']}
            />
            <SceneForm projectId={projectId} />
        </>
    )
}
