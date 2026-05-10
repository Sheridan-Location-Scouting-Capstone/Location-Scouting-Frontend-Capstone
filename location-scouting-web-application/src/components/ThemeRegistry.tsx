'use client'

import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from '@/theme'
import createCache from "@emotion/cache";
import {useState} from "react";
import {CacheProvider} from "@emotion/react";

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const [cache] = useState(() => {
        const c = createCache({ key: 'mui' })
        c.compat = true
        return c
    })

  return (
      <CacheProvider value = {cache}>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
      </CacheProvider>
  )
}
