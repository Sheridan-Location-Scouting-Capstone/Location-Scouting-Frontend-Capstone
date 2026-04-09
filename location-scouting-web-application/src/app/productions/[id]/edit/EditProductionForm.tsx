'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Grid,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { updateProjectAction } from '@/app/actions/productionActions'
import { Project } from '@prisma/client'

export default function EditProductionForm({ project }: { project: Project }) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitting(true)
        const formData = new FormData(e.currentTarget)
        try {
            await updateProjectAction(project.id, formData)
        } catch {
            // redirect happens in server action
        }
        setSubmitting(false)
    }

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Edit Production
            </Typography>

            <form onSubmit={handleSubmit}>
                <Card sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <EditIcon color="primary" />
                            <Typography variant="h6">Production Details</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
                            <TextField
                                name="name"
                                label="Production Name"
                                defaultValue={project.name}
                                required
                                fullWidth
                            />

                            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                                Studio Address
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={12}>
                                    <TextField
                                        name="address"
                                        label="Street Address"
                                        defaultValue={project.address}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid size={6}>
                                    <TextField
                                        name="city"
                                        label="City"
                                        defaultValue={project.city}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid size={3}>
                                    <TextField
                                        name="province"
                                        label="Province"
                                        defaultValue={project.province}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid size={3}>
                                    <TextField
                                        name="postalCode"
                                        label="Postal Code"
                                        defaultValue={project.postalCode}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid size={6}>
                                    <TextField
                                        name="country"
                                        label="Country"
                                        defaultValue={project.country}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </CardContent>
                </Card>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => router.push(`/productions/${project.id}`)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Box>
            </form>
        </Box>
    )
}