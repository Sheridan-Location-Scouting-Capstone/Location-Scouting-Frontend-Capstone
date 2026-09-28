import { Box, CircularProgress } from '@mui/material'

export default function ProtectedLoading() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress aria-label="Loading" />
        </Box>
    )
}
