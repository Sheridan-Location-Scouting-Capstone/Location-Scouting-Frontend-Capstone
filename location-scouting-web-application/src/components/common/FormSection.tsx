import { ReactNode } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'

/** A titled card used to group form fields */
export default function FormSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    {icon}
                    <Typography variant="h6" component="h2">{title}</Typography>
                </Box>
                {children}
            </CardContent>
        </Card>
    )
}
