import { Button } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import ShareIcon from '@mui/icons-material/Share'
import { getLocationAction } from '@/actions/locationActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'
import LinkButton from '@/components/common/LinkButton'
import LocationDetailsCard from '@/components/locations/LocationDetailsCard'
import LocationPhotoGallery from '@/components/locations/LocationPhotoGallery'
import LocationStatusActions from '@/components/locations/LocationStatusActions'

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const location = unwrapForPage(await getLocationAction(id))

    return (
        <>
            <PageHeader
                title={location.name}
                backHref="/locations"
                actions={
                    <>
                        <LocationStatusActions locationId={location.id} currentStatus={location.status} />
                        {/* Not wired up yet */}
                        <Button variant="contained" color="secondary" startIcon={<ShareIcon />}>
                            Share
                        </Button>
                        <LinkButton href={`/locations/${location.id}/edit`} variant="contained" startIcon={<EditIcon />}>
                            Edit Location
                        </LinkButton>
                    </>
                }
            />
            <LocationDetailsCard location={location} />
            <LocationPhotoGallery photos={location.photos} locationId={location.id} />
        </>
    )
}
