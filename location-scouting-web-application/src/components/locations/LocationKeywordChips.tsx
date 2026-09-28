'use client'

import { useState } from 'react'
import { Box, Chip, Typography } from '@mui/material'
import { removeKeywordAction } from '@/actions/locationActions'
import { useActionRunner } from '@/hooks/useActionRunner'
import ErrorSnackbar from '@/components/common/ErrorSnackbar'

/** A location's tags, each removable. A tag only disappears once the server has removed it. */
export default function LocationKeywordChips({ locationId, initialKeywords }: { locationId: string; initialKeywords: string[] }) {
    const [keywords, setKeywords] = useState(initialKeywords)
    const { run, isPending, error, clearError } = useActionRunner()

    const handleRemove = (keyword: string) => {
        run(() => removeKeywordAction(locationId, keyword), {
            onSuccess: () => setKeywords((previous) => previous.filter((k) => k !== keyword)),
        })
    }

    return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {keywords.length > 0 ? (
                keywords.map((keyword) => (
                    <Chip
                        key={keyword}
                        label={keyword}
                        size="small"
                        variant="outlined"
                        disabled={isPending}
                        onDelete={() => handleRemove(keyword)}
                    />
                ))
            ) : (
                <Typography variant="body2" color="text.secondary">No tags</Typography>
            )}
            <ErrorSnackbar message={error} onClose={clearError} />
        </Box>
    )
}
