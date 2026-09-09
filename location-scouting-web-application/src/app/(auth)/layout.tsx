// src/app/(auth)/layout.tsx
import { redirect } from "next/navigation";
import { Box, Container, Paper, Typography } from "@mui/material";
import { getCurrentUser } from "@/lib/auth-session";

export default async function AuthLayout({children,}: { children: React.ReactNode; }) {
    // Already signed in? Bounce to locations
    const user = await getCurrentUser();
    if (user) redirect("/locations");

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                bgcolor: "grey.50",
                p: 2,
            }}
        >
            <Container maxWidth="xs">
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        justifyContent: "center",
                        mb: 4,
                    }}
                >
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: "primary.main",
                            display: "grid",
                            placeItems: "center",
                            color: "white",
                            fontWeight: 700,
                        }}
                    >
                        L
                    </Box>
                    <Typography variant="h5" fontWeight={700}>
                        LocusPoint
                    </Typography>
                </Box>
                <Paper elevation={1} sx={{ p: 4 }}>
                    {children}
                </Paper>
            </Container>
        </Box>
    );
}