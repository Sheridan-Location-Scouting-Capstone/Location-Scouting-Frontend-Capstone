'use client'

import { useState } from 'react'
import { Box, Chip, Typography } from '@mui/material'
import { removeKeywordAction } from '@/actions/locationActions'

export default function KeywordChips({ locationId, initialKeywords }: {
    locationId: string
    initialKeywords: string[]
}) {
    const [keywords, setKeywords] = useState(initialKeywords)

    const handleRemove = async (kw: string) => {
        await removeKeywordAction(locationId, kw)
        setKeywords(prev => prev.filter(k => k !== kw))
    }

    return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {keywords.length > 0 ? (
                keywords.map((kw) => (
                    <Chip key={kw} label={kw} size="small" variant="outlined" onDelete={() => handleRemove(kw)} />
                ))
            ) : (
                <Typography variant="body2" color="text.secondary">No tags</Typography>
            )}
        </Box>
    )
}