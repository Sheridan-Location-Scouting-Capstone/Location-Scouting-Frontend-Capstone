'use client'

import { Box, Chip } from '@mui/material'
import { alpha } from '@mui/material/styles'

type StatusChipProps = {
    label: string
    color?: 'success' | 'warning' | 'error' | 'info' | 'primary'
    'data-testid'?: string
}

export default function StatusChip({ label, color = 'success', ...rest }: StatusChipProps) {
    return (
        <Chip
            label={label}
            size="small"
            color={color}
            variant="outlined"
            {...rest}
            icon={
                <Box
                    component="span"
                    sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${color}.main` }}
                />
            }
            sx={(theme) => ({
                bgcolor: alpha(theme.palette[color].main, 0.1),
                borderColor: alpha(theme.palette[color].main, 0.4),
                fontWeight: 600,
                px: 0.5,
                '& .MuiChip-icon': { ml: 1, mr: -0.25 },
            })}
        />
    )
}