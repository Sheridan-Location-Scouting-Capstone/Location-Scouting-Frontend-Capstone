/* eslint-disable @next/next/no-img-element -- photos are presigned object storage URLs that change as they're re-signed; next/image would re-optimize every new signature */
import { Box } from '@mui/material'

type ThumbnailProps = {
    url: string | null | undefined
    alt: string
    width?: number
    height?: number
    grayscale?: boolean
}

/** Small cover image for table rows and pickers, with a "No img" placeholder */
export default function Thumbnail({ url, alt, width = 60, height = 45, grayscale = false }: ThumbnailProps) {
    return (
        <Box sx={{ width, height, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.300', flexShrink: 0 }}>
            {url ? (
                <img
                    src={url}
                    alt={alt}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: grayscale ? 'grayscale(100%)' : 'none' }}
                />
            ) : (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.disabled',
                        fontSize: '0.7rem',
                    }}
                >
                    No img
                </Box>
            )}
        </Box>
    )
}
