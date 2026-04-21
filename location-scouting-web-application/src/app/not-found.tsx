// app/not-found.tsx
'use client'

import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

export default function NotFound() {
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="60vh"
            gap={2}
        >
            <Typography variant="h1" color="text.primary">
                404
            </Typography>
            <Typography variant="h6" color="text.secondary">
                Page not found
            </Typography>
            <Button component={Link} href="/" variant="contained">
                Go Home
            </Button>
        </Box>
    );
}