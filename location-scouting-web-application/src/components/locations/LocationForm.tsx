'use client'

import { useState } from 'react'
import { Box, Chip, Grid, TextField, Typography } from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { createLocationAction, updateLocationAction } from '@/actions/locationActions'
import { useFormAction } from '@/hooks/useFormAction'
import { fieldErrorProps } from '@/lib/actionResult'
import FormSection from '@/components/common/FormSection'
import FormActions from '@/components/common/FormActions'
import FormErrorAlert from '@/components/common/FormErrorAlert'
import LocationPhotoPicker, { PickedPhoto } from '@/components/locations/LocationPhotoPicker'

export type LocationFormValues = {
    id: string
    name: string
    address: string
    city: string
    province: string
    postalCode: string
    country: string
    notes: string | null
    keywords: string[]
    contactName: string | null
    contactPhone: string | null
    contactEmail: string | null
}

const MAX_KEYWORDS = 50
const INVALID_PHONE = 'Invalid phone number'

function isInvalidPhone(phone: string) {
    return Boolean(phone) && !isValidPhoneNumber(phone, 'CA')
}

/** Create a location (with photos), or edit an existing one when `location` is given */
export default function LocationForm({ location }: { location?: LocationFormValues }) {
    const [keywords, setKeywords] = useState<string[]>(location?.keywords ?? [])
    const [keywordInput, setKeywordInput] = useState('')
    const [contactPhone, setContactPhone] = useState(location?.contactPhone ?? '')
    const [phoneError, setPhoneError] = useState('')
    const [photos, setPhotos] = useState<PickedPhoto[]>([])

    const { failure, submit, isPending } = useFormAction((formData) =>
        location ? updateLocationAction(location.id, formData) : createLocationAction(formData)
    )

    const addKeyword = () => {
        const trimmed = keywordInput.trim()
        if (trimmed && !keywords.includes(trimmed) && keywords.length < MAX_KEYWORDS) {
            setKeywords([...keywords, trimmed])
            setKeywordInput('')
        }
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (isInvalidPhone(contactPhone)) {
            setPhoneError(INVALID_PHONE)
            return
        }

        const formData = new FormData(event.currentTarget)
        formData.set('keywords', keywords.join(','))
        photos.forEach((photo) => {
            formData.append('photos', photo.file)
            formData.append('photoNames', photo.name)
        })
        submit(formData)
    }

    const phoneFieldError = phoneError ? { error: true, helperText: phoneError } : fieldErrorProps(failure, 'contactPhone')

    return (
        <form onSubmit={handleSubmit}>
            <FormErrorAlert failure={failure} />

            <FormSection icon={<ImageIcon color="primary" />} title="Location Details">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
                    <TextField
                        name="name"
                        label="Location Name"
                        required
                        fullWidth
                        defaultValue={location?.name}
                        {...fieldErrorProps(failure, 'name')}
                    />

                    <TextField
                        name="notes"
                        label="Description"
                        multiline
                        rows={3}
                        fullWidth
                        defaultValue={location?.notes ?? ''}
                        {...fieldErrorProps(failure, 'notes')}
                    />

                    <Grid container spacing={2}>
                        <Grid size={12}>
                            <TextField name="address" label="Street Address" required fullWidth defaultValue={location?.address} {...fieldErrorProps(failure, 'address')} />
                        </Grid>
                        <Grid size={6}>
                            <TextField name="city" label="City" required fullWidth defaultValue={location?.city} {...fieldErrorProps(failure, 'city')} />
                        </Grid>
                        <Grid size={3}>
                            <TextField name="province" label="Province" required fullWidth defaultValue={location?.province} {...fieldErrorProps(failure, 'province')} />
                        </Grid>
                        <Grid size={3}>
                            <TextField name="postalCode" label="Postal Code" required fullWidth defaultValue={location?.postalCode} {...fieldErrorProps(failure, 'postalCode')} />
                        </Grid>
                        <Grid size={6}>
                            <TextField name="country" label="Country" fullWidth defaultValue={location?.country ?? 'Canada'} {...fieldErrorProps(failure, 'country')} />
                        </Grid>
                    </Grid>

                    {/* Keywords / Tags — kept in state and submitted as a comma-separated list */}
                    <Box>
                        <TextField
                            label="Tags"
                            fullWidth
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addKeyword()
                                }
                            }}
                            helperText="Press Enter to add a tag"
                        />
                        {keywords.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                {keywords.map((keyword) => (
                                    <Chip
                                        key={keyword}
                                        label={keyword}
                                        size="small"
                                        onDelete={() => setKeywords(keywords.filter((k) => k !== keyword))}
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        )}
                    </Box>

                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                        Contact Information
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={12}>
                            <TextField
                                name="contactName"
                                label="Contact Name"
                                fullWidth
                                defaultValue={location?.contactName ?? ''}
                                slotProps={{ htmlInput: { maxLength: 70 } }}
                                {...fieldErrorProps(failure, 'contactName')}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                name="contactPhone"
                                label="Phone"
                                type="tel"
                                fullWidth
                                value={contactPhone}
                                onChange={(e) => {
                                    setContactPhone(e.target.value)
                                    if (phoneError) setPhoneError('')
                                }}
                                onBlur={() => setPhoneError(isInvalidPhone(contactPhone) ? INVALID_PHONE : '')}
                                slotProps={{ htmlInput: { maxLength: 20 } }}
                                {...phoneFieldError}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                name="contactEmail"
                                label="Email"
                                type="email"
                                fullWidth
                                defaultValue={location?.contactEmail ?? ''}
                                {...fieldErrorProps(failure, 'contactEmail')}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </FormSection>

            {!location && (
                <FormSection icon={<CloudUploadIcon color="primary" />} title="Upload Photos">
                    <LocationPhotoPicker photos={photos} onChange={setPhotos} disabled={isPending} />
                </FormSection>
            )}

            <FormActions
                cancelHref={location ? `/locations/${location.id}` : '/locations'}
                submitLabel={location ? 'Save Changes' : 'Add Location'}
                pendingLabel={location ? 'Saving...' : 'Creating...'}
                isPending={isPending}
            />
        </form>
    )
}
