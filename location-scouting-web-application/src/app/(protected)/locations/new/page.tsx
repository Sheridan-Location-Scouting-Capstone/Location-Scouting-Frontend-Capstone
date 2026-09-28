import PageHeader from '@/components/common/PageHeader'
import LocationForm from '@/components/locations/LocationForm'

export default function NewLocationPage() {
    return (
        <>
            <PageHeader title="Add New Location" />
            <LocationForm />
        </>
    )
}
