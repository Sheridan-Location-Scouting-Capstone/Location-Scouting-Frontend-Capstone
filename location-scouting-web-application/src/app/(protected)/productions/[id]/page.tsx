import { notFound } from 'next/navigation'
import AddIcon from '@mui/icons-material/Add'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import { getProject, getScenesAction } from '@/actions/productionActions'
import PageHeader from '@/components/common/PageHeader'
import LinkButton from '@/components/common/LinkButton'
import SceneTable from '@/components/scenes/SceneTable'

export default async function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const result = await getProject(id)
    if (!result.success) notFound()
    const project = result.data

    const scenes = await getScenesAction(project.id)

    return (
        <>
            <PageHeader
                title={`${project.name} - Scenes`}
                backHref="/productions"
                actions={
                    <>
                        <LinkButton href={`/productions/${project.id}/edit`} variant="contained" color="secondary">
                            Manage Production
                        </LinkButton>
                        <LinkButton href={`/productions/${project.id}/analytics`} variant="outlined" startIcon={<AnalyticsIcon />}>
                            Analytics
                        </LinkButton>
                        <LinkButton href={`/productions/${project.id}/scenes/new`} variant="contained" startIcon={<AddIcon />}>
                            Add New Scene
                        </LinkButton>
                    </>
                }
            />
            <SceneTable scenes={scenes} projectId={project.id} />
        </>
    )
}
