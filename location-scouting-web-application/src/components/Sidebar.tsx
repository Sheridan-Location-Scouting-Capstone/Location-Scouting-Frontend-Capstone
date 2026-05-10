'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import LocationOnIcon from '@mui/icons-material/Terrain'
import PeopleIcon from '@mui/icons-material/People'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'

const DRAWER_WIDTH = 220

const navItems = [
  { label: 'Productions', href: '/productions', icon: <MovieIcon /> },
  { label: 'Locations', href: '/locations', icon: <LocationOnIcon /> },
  // { label: 'Contacts', href: '/contacts', icon: <PeopleIcon /> },
  // { label: 'Calendar', href: '/calendar', icon: <CalendarMonthIcon /> },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          border: 'none',
          bgcolor: 'background.paper',
          pt: 2,
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 2.5, pb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.1rem',
          }}
        >
          M
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          LocusPoint
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1.5 }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                px: 2,
                py: 1.2,
                bgcolor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? 'white' : 'text.secondary',
                '&:hover': {
                  bgcolor: isActive ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? 'white' : 'text.secondary',
                  minWidth: 36,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                }}
              />
            </ListItemButton>
          )
        })}
      </List>
    </Drawer>
  )
}

export { DRAWER_WIDTH }
