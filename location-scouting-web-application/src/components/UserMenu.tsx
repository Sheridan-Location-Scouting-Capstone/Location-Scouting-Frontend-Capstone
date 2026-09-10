'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, IconButton, Menu, MenuItem, ListItemText, Divider, Box, Typography } from '@mui/material'
import { signOut } from '@/lib/auth-client'

export default function UserMenu({ name, email }: { name: string; email: string }) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [pending, setPending] = useState(false)
    const router = useRouter()

    const handleSignOut = async () => {
        setPending(true)
        await signOut()
        setAnchorEl(null)
        router.push('/')
        router.refresh()
    }

    return (
        <>
            <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                size="small"
                aria-label="Account menu"
                data-testid="user-menu-trigger"
            >
                <Avatar sx={{ width: 32, height: 32 }}>
                    {name?.charAt(0).toUpperCase() ?? '?'}
                </Avatar>
            </IconButton>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="body2">{name}</Typography>
                    <Typography variant="caption" color="text.secondary">{email}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleSignOut} disabled={pending} data-testid="sign-out">
                    <ListItemText>{pending ? 'Signing out…' : 'Sign out'}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    )
}