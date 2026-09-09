import { Box, Avatar } from '@mui/material'
//import StarBorderIcon from '@mui/icons-material/StarBorder'
import Sidebar, { DRAWER_WIDTH } from '@/components/Sidebar'
import { auth } from "@/lib/auth"
import {headers} from "next/headers";
import {redirect} from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/")

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
  )
}
