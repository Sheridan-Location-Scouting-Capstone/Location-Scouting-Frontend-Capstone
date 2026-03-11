import type { Metadata } from 'next'
import { Box, Avatar, IconButton } from '@mui/material'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import ThemeRegistry from '@/app/components/ThemeRegistry'
import Sidebar, { DRAWER_WIDTH } from '@/app/components/Sidebar'

export const metadata: Metadata = {
  title: 'LocusPoint - Location Scouting',
  description: 'Film location scouting management application',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
      <head>
        <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>
      <ThemeRegistry>
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
          <Sidebar />

          {/* Main content area */}
          <Box sx={{ flexGrow: 1, ml: `${DRAWER_WIDTH}px` }}>
            {/* Top bar */}
            <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 1,
                  px: 3,
                  py: 1.5,
                }}
            >
              <Avatar
                  sx={{ width: 36, height: 36, bgcolor: 'primary.main', ml: 1 }}
              >
                U
              </Avatar>
            </Box>

            {/* Page content */}
            <Box sx={{ px: 4, pb: 4 }}>
              {children}
            </Box>
          </Box>
        </Box>
      </ThemeRegistry>
      </body>
      </html>
  )
}
