import { getProject } from '@/actions/productionActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'
import ProductionForm from '@/components/productions/ProductionForm'

export default async function EditProductionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const project = unwrapForPage(await getProject(id))

    return (
        <>
            <PageHeader title="Edit Production" breadcrumbs={[project.name, 'Edit']} backHref={`/productions/${project.id}`} />
            <ProductionForm project={project} />
        </>
    )
}
