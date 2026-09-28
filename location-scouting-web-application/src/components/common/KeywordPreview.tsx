import { Box, Chip, ChipProps } from '@mui/material'

type KeywordPreviewProps = {
    keywords: string[]
    /** How many chips to show before collapsing the rest into "+N" */
    max?: number
    color?: ChipProps['color']
    fontSize?: string
}

/** The first few keywords as chips, with a "+N" chip for the rest */
export default function KeywordPreview({ keywords, max = 3, color = 'default', fontSize = '0.75rem' }: KeywordPreviewProps) {
    const hidden = keywords.length - max

    return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {keywords.slice(0, max).map((keyword) => (
                <Chip key={keyword} label={keyword} size="small" variant="outlined" color={color} sx={{ fontSize }} />
            ))}
            {hidden > 0 && <Chip label={`+${hidden}`} size="small" sx={{ fontSize }} />}
        </Box>
    )
}
