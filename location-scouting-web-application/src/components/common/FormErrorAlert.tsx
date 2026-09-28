import { Alert } from '@mui/material'
import type { ActionFailure } from '@/lib/actionResult'

/** The form-level message from a failed action. Field-specific messages are shown on the fields themselves. */
export default function FormErrorAlert({ failure }: { failure: ActionFailure | null }) {
    if (!failure) return null
    return (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
            {failure.error}
        </Alert>
    )
}
