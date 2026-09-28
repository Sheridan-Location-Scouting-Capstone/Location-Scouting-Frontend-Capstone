'use client'

import { Box, Grid, TextField, Typography } from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import EditIcon from '@mui/icons-material/Edit'
import { createProjectAction, updateProjectAction } from '@/actions/productionActions'
import { useFormAction } from '@/hooks/useFormAction'
import { fieldErrorProps } from '@/lib/actionResult'
import FormSection from '@/components/common/FormSection'
import FormActions from '@/components/common/FormActions'
import FormErrorAlert from '@/components/common/FormErrorAlert'

export type ProductionFormValues = {
    id: string
    name: string
    address: string
    city: string
    province: string
    postalCode: string
    country: string
}

/** Create a production, or edit an existing one when `project` is given */
export default function ProductionForm({ project }: { project?: ProductionFormValues }) {
    const { failure, submit, isPending } = useFormAction((formData) =>
        project ? updateProjectAction(project.id, formData) : createProjectAction(formData)
    )

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        submit(new FormData(event.currentTarget))
    }

    return (
        <form onSubmit={handleSubmit}>
            <FormErrorAlert failure={failure} />

            <FormSection
                icon={project ? <EditIcon color="primary" /> : <ImageIcon color="primary" />}
                title={project ? 'Production Details' : 'Production Overview'}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
                    <TextField name="name" label="Production Name" required fullWidth defaultValue={project?.name} {...fieldErrorProps(failure, 'name')} />

                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                        Studio Address
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={12}>
                            <TextField name="address" label="Street Address" required fullWidth defaultValue={project?.address} {...fieldErrorProps(failure, 'address')} />
                        </Grid>
                        <Grid size={6}>
                            <TextField name="city" label="City" required fullWidth defaultValue={project?.city} {...fieldErrorProps(failure, 'city')} />
                        </Grid>
                        <Grid size={3}>
                            <TextField name="province" label="Province" required fullWidth defaultValue={project?.province} {...fieldErrorProps(failure, 'province')} />
                        </Grid>
                        <Grid size={3}>
                            <TextField name="postalCode" label="Postal Code" required fullWidth defaultValue={project?.postalCode} {...fieldErrorProps(failure, 'postalCode')} />
                        </Grid>
                        <Grid size={6}>
                            <TextField name="country" label="Country" fullWidth defaultValue={project?.country ?? 'Canada'} {...fieldErrorProps(failure, 'country')} />
                        </Grid>
                    </Grid>
                </Box>
            </FormSection>

            <FormActions
                cancelHref={project ? `/productions/${project.id}` : '/productions'}
                submitLabel={project ? 'Save Changes' : 'Add Production'}
                pendingLabel={project ? 'Saving...' : 'Creating...'}
                isPending={isPending}
            />
        </form>
    )
}
