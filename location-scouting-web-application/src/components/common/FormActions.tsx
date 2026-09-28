'use client'

import { Box, Button } from '@mui/material'
import LinkButton from '@/components/common/LinkButton'

type FormActionsProps = {
    cancelHref: string
    submitLabel: string
    pendingLabel: string
    isPending: boolean
}

/** Cancel + submit row shared by every create/edit form */
export default function FormActions({ cancelHref, submitLabel, pendingLabel, isPending }: FormActionsProps) {
    return (
        <Box sx={{ display: 'flex', gap: 2 }}>
            <LinkButton href={cancelHref} variant="contained" color="secondary" disabled={isPending}>
                Cancel
            </LinkButton>
            <Button type="submit" variant="contained" disabled={isPending}>
                {isPending ? pendingLabel : submitLabel}
            </Button>
        </Box>
    )
}
