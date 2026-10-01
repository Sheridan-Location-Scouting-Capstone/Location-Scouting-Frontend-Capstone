'use client'

import {ReactNode} from "react";
import {Paper, Stack, Typography} from "@mui/material";

export type StatCardProps = {
    label: string,
    icon?: ReactNode,
    value: ReactNode,
    caption?: ReactNode,
    'data-testid'?: string
}

export default function StatCard({label, icon, value, caption, ... rest }: StatCardProps) {
    return (
        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2}} {... rest}>
            <Typography variant='overline' color='textSecondary' sx={{ fontWeight: 600, letterSpacing: 1 }}>
                {label}
            </Typography>
            <Stack direction='row' alignItems='center' spacing={1} sx={{mt:0.5}}>
                {icon}
                <Typography variant='h5' component='p' sx={{ fontWeight: 700 }}>
                    {value}
                </Typography>
            </Stack>
            {caption && (
                <Typography variant='caption' color='text.secondary'>{caption}</Typography>
            )}
        </Paper>
    )
}