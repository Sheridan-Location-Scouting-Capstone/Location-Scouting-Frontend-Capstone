'use client'

import { Box, Button, Typography } from '@mui/material'

/** Shown in place of a page when loading or an action throws unexpectedly. Expected failures are handled in the page. */
export default function ProtectedError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
            <Typography variant="h5" component="h1">Something went wrong</Typography>
            <Typography color="text.secondary">We couldn&apos;t load this page. Please try again.</Typography>
            <Button variant="contained" onClick={reset}>Try again</Button>
        </Box>
    )
}
