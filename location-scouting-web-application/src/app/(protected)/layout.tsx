import { Box } from '@mui/material'
//import StarBorderIcon from '@mui/icons-material/StarBorder'
import Sidebar, { DRAWER_WIDTH } from '@/components/Sidebar'
import UserMenu from '@/components/UserMenu'
import { requireUser } from '@/lib/auth-session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await requireUser()

    return (
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
              <UserMenu name={user.name} email={user.email} />
            </Box>

            {/* Page content */}
            <Box sx={{ px: 4, pb: 4 }}>
              {children}
            </Box>
          </Box>
        </Box>
  )
}
