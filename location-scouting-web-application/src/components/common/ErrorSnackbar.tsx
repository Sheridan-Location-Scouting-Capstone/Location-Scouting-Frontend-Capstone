'use client'

import { Alert, Snackbar } from '@mui/material'

/** Transient error for actions triggered outside a form (menus, chips, table rows) */
export default function ErrorSnackbar({ message, onClose }: { message: string | null; onClose: () => void }) {
    return (
        <Snackbar
            open={Boolean(message)}
            autoHideDuration={6000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert severity="error" onClose={onClose} variant="filled" sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    )
}
