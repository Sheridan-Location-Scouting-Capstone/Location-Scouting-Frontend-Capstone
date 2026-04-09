import { notFound } from 'next/navigation'
import { getProjectById } from '@/app/services/productionService'
import EditProductionForm from './EditProductionForm'

export default async function EditProductionPage({params}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const result = await getProjectById(id)
    if (!result.success) notFound()

    return <EditProductionForm project={result.data} />
}