import { ReactNode } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'
import LocationKeywordChips from '@/components/locations/LocationKeywordChips'
import { formatAddress } from '@/lib/format'

type LocationDetails = {
    id: string
    notes: string | null
    keywords: string[]
    address: string
    city: string
    province: string
    postalCode: string
    country: string
    contactName: string | null
    contactPhone: string | null
    contactEmail: string | null
}

function DetailColumn({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} component="h2">
                {label}
            </Typography>
            {children}
        </Box>
    )
}

/** Description, tags, address and contact for the location detail page */
export default function LocationDetailsCard({ location }: { location: LocationDetails }) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr', gap: 2 }}>
                    <DetailColumn label="Description">
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {location.notes || 'No description added.'}
                        </Typography>
                    </DetailColumn>

                    <DetailColumn label="Tags">
                        <LocationKeywordChips locationId={location.id} initialKeywords={location.keywords} />
                    </DetailColumn>

                    <DetailColumn label="Address">
                        <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                            {formatAddress(location)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {location.postalCode}, {location.country}
                        </Typography>
                    </DetailColumn>

                    <DetailColumn label="Contact">
                        {/* Any one contact detail is worth showing, not only when there's a name */}
                        {location.contactName || location.contactPhone || location.contactEmail ? (
                            <Box sx={{ mt: 0.5 }}>
                                {location.contactName && <Typography variant="body2">{location.contactName}</Typography>}
                                {location.contactPhone && (
                                    <Typography variant="body2" color="text.secondary">{location.contactPhone}</Typography>
                                )}
                                {location.contactEmail && (
                                    <Typography variant="body2" color="primary.main">{location.contactEmail}</Typography>
                                )}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                No contact info
                            </Typography>
                        )}
                    </DetailColumn>
                </Box>
            </CardContent>
        </Card>
    )
}
