import { getLocationAction } from '@/actions/locationActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'
import LocationForm from '@/components/locations/LocationForm'

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const location = unwrapForPage(await getLocationAction(id))

    return (
        <>
            <PageHeader title="Edit Location" breadcrumbs={[location.name, 'Edit']} backHref={`/locations/${location.id}`} />
            <LocationForm location={location} />
        </>
    )
}
