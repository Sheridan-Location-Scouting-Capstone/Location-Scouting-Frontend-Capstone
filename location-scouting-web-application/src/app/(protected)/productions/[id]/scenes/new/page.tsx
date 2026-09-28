import { getProject } from '@/actions/productionActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'
import SceneForm from '@/components/scenes/SceneForm'

export default async function NewScenePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params

    const project = unwrapForPage(await getProject(projectId))

    return (
        <>
            <PageHeader
                title="Add New Scene"
                backHref={`/productions/${projectId}`}
                breadcrumbs={[project.name, 'Scenes', 'New']}
            />
            <SceneForm projectId={projectId} />
        </>
    )
}
