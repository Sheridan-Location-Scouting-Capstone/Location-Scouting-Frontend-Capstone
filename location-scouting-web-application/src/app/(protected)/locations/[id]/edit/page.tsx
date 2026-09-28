import { notFound } from 'next/navigation'
import { getLocationAction } from '@/actions/locationActions'
import PageHeader from '@/components/common/PageHeader'
import LocationForm from '@/components/locations/LocationForm'

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const location = await getLocationAction(id)
    if (!location) notFound()

    return (
        <>
            <PageHeader title="Edit Location" breadcrumbs={[location.name, 'Edit']} backHref={`/locations/${location.id}`} />
            <LocationForm location={location} />
        </>
    )
}
