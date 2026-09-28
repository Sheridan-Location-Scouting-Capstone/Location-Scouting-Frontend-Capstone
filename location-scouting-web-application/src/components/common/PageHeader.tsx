import { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LinkButton from '@/components/common/LinkButton'

type PageHeaderProps = {
    title: ReactNode
    /** Where the Back button goes. No Back button when omitted. */
    backHref?: string
    /** Trail shown next to the Back button, e.g. ['My Film', 'Scenes', 'Scene 3']. The last entry is emphasised. */
    breadcrumbs?: string[]
    /** Buttons on the right of the title row */
    actions?: ReactNode
}

/** Standard page header: optional back link and breadcrumb trail, then the title with actions on the right */
export default function PageHeader({ title, backHref, breadcrumbs, actions }: PageHeaderProps) {
    const hasNavRow = Boolean(backHref || breadcrumbs?.length)

    return (
        <Box component="header" sx={{ mb: 3 }}>
            {hasNavRow && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    {backHref && (
                        <LinkButton href={backHref} startIcon={<ArrowBackIcon />} variant="outlined" size="small">
                            Back
                        </LinkButton>
                    )}
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <Typography variant="body2" color="text.secondary" component="nav" aria-label="Breadcrumb">
                            {breadcrumbs.map((crumb, index) => {
                                const isLast = index === breadcrumbs.length - 1
                                return (
                                    <Box component="span" key={`${index}-${crumb}`}>
                                        {index > 0 && <Box component="span" sx={{ mx: 1 }}>/</Box>}
                                        <Box
                                            component="span"
                                            sx={isLast ? { color: 'text.primary', fontWeight: 600 } : undefined}
                                            aria-current={isLast ? 'page' : undefined}
                                        >
                                            {crumb}
                                        </Box>
                                    </Box>
                                )
                            })}
                        </Typography>
                    )}
                </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h4" component="h1">{title}</Typography>
                {actions && <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>{actions}</Box>}
            </Box>
        </Box>
    )
}
