'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from '@mui/material'
import { formatTimeAgo } from '@/lib/format'

type ProductionCard = {
    id: string
    name: string
    city: string
    province: string
    createdAt: Date
    updatedAt: Date
}

export type ProductionSortOrder = 'newest' | 'oldest'

export function sortProductions<T extends { createdAt: Date }>(projects: T[], order: ProductionSortOrder) {
    const direction = order === 'newest' ? -1 : 1
    return [...projects].sort((a, b) => direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
}

export default function ProductionGrid({ projects }: { projects: ProductionCard[] }) {
    const [sortOrder, setSortOrder] = useState<ProductionSortOrder>('newest')
    const sorted = useMemo(() => sortProductions(projects, sortOrder), [projects, sortOrder])

    if (projects.length === 0) {
        return (
            <Card sx={{ p: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                    No productions yet. Create your first production to get started!
                </Typography>
            </Card>
        )
    }

    return (
        <Box>
            <Card sx={{ p: 2.5, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel id="production-sort-label">Sort by Date</InputLabel>
                    <Select
                        labelId="production-sort-label"
                        value={sortOrder}
                        label="Sort by Date"
                        onChange={(e) => setSortOrder(e.target.value as ProductionSortOrder)}
                    >
                        <MenuItem value="newest">Newest - Oldest</MenuItem>
                        <MenuItem value="oldest">Oldest - Newest</MenuItem>
                    </Select>
                </FormControl>
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                {sorted.map((project) => (
                    <Card key={project.id} sx={{ borderRadius: 3, overflow: 'hidden' }} data-testid="production-card">
                        <CardActionArea component={Link} href={`/productions/${project.id}`}>
                            <CardContent sx={{ pb: 0 }}>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                                    {project.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {project.city}, {project.province}
                                </Typography>
                            </CardContent>

                            {/* Placeholder image area */}
                            <Box
                                sx={{
                                    mx: 2,
                                    mt: 1.5,
                                    height: 160,
                                    borderRadius: 1.5,
                                    bgcolor: 'grey.200',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">No thumbnail</Typography>
                            </Box>

                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                    {/* Dates render in the viewer's locale and clock, which can differ from the server's */}
                                    <Typography variant="caption" color="text.secondary" suppressHydrationWarning>
                                        Created {new Date(project.createdAt).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" suppressHydrationWarning>
                                        Edited {formatTimeAgo(project.updatedAt)}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Box>
        </Box>
    )
}
