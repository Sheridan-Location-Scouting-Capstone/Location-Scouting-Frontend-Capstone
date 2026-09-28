'use client'

import { useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
    Alert,
    Avatar,
    Box,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Typography,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { signOut } from '@/lib/auth-client'

type UserMenuProps = {
    name: string
    email: string
}

export default function UserMenu({ name, email }: UserMenuProps) {
    const router = useRouter()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [signingOut, setSigningOut] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const menuOpen = Boolean(anchorEl)
    const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : 'U'

    const handleOpen = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
        setErrorMessage(null)
    }

    const handleClose = () => {
        if (!signingOut) {
            setAnchorEl(null)
        }
    }

    const handleSignOut = async () => {
        setSigningOut(true)
        setErrorMessage(null)

        const result = await signOut()

        setSigningOut(false)

        if (result?.error) {
            setErrorMessage(result.error.message || 'Unable to sign out. Please try again.')
            return
        }

        router.push('/')
        router.refresh()
    }

    return (
        <>
            <IconButton
                aria-controls={menuOpen ? 'user-menu' : undefined}
                aria-expanded={menuOpen ? 'true' : undefined}
                aria-haspopup="true"
                onClick={handleOpen}
                data-testid="user-menu-button"
                sx={{ width: 36, height: 36, ml: 1, p: 0 }}
            >
                <Avatar
                    sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'primary.main',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                    }}
                >
                    {initial}
                </Avatar>
            </IconButton>

            <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: { minWidth: 220, mt: 1 },
                    },
                }}
                data-testid="user-menu"
            >
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} data-testid="user-menu-name">
                        {name || 'User'}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        data-testid="user-menu-email"
                        sx={{ display: 'block' }}
                    >
                        {email}
                    </Typography>
                </Box>

                <Divider />

                <MenuItem
                    onClick={handleSignOut}
                    disabled={signingOut}
                    data-testid="user-menu-signout"
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LogoutIcon fontSize="small" />
                        <Typography variant="body2">
                            {signingOut ? 'Signing out...' : 'Sign out'}
                        </Typography>
                    </Box>
                </MenuItem>

                {errorMessage && (
                    <Alert severity="error" sx={{ mx: 2, mt: 1, mb: 0.5 }}>
                        {errorMessage}
                    </Alert>
                )}
            </Menu>
        </>
    )
}
