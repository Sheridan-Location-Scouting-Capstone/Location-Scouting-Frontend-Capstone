import AddIcon from '@mui/icons-material/Add'
import { getLocationsAction } from '@/actions/locationActions'
import PageHeader from '@/components/common/PageHeader'
import LinkButton from '@/components/common/LinkButton'
import LocationTable from '@/components/locations/LocationTable'

export default async function LocationsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; keywords?: string }>
}) {
    const params = await searchParams
    const query = params.q || undefined
    const keywords = params.keywords ? params.keywords.split(',') : undefined

    const locations = await getLocationsAction(query, keywords)

    return (
        <>
            <PageHeader
                title="Locations"
                actions={
                    <LinkButton href="/locations/new" variant="contained" startIcon={<AddIcon />} size="large" data-testid="add-new-location">
                        Add New Location
                    </LinkButton>
                }
            />
            <LocationTable locations={locations} />
        </>
    )
}
