import { notFound } from 'next/navigation'
import { getProject } from '@/actions/productionActions'
import PageHeader from '@/components/common/PageHeader'
import ProductionForm from '@/components/productions/ProductionForm'

export default async function EditProductionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getProject(id)
    if (!result.success) notFound()
    const project = result.data

    return (
        <>
            <PageHeader title="Edit Production" breadcrumbs={[project.name, 'Edit']} backHref={`/productions/${project.id}`} />
            <ProductionForm project={project} />
        </>
    )
}
