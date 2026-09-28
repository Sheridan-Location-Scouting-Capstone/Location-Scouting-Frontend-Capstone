'use client'

import { useState } from 'react'
import { Button, Menu, MenuItem } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ArchiveIcon from '@mui/icons-material/Archive'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import { updateLocationStatusAction } from '@/actions/locationActions'
import { useActionRunner } from '@/hooks/useActionRunner'
import ErrorSnackbar from '@/components/common/ErrorSnackbar'

type LocationStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED'

const STATUS_LABELS: Record<LocationStatus, string> = {
    ACTIVE: 'Active',
    ARCHIVED: 'Archived',
    DELETED: 'Deleted',
}

/** Status dropdown on the location detail page: restore, archive, or delete */
export default function LocationStatusActions({ locationId, currentStatus }: { locationId: string; currentStatus: LocationStatus }) {
    const [anchor, setAnchor] = useState<null | HTMLElement>(null)
    const { run, isPending, error, clearError } = useActionRunner()

    const handleAction = (status: LocationStatus) => {
        setAnchor(null)
        run(() => updateLocationStatusAction(locationId, status))
    }

    return (
        <>
            <Button
                variant="outlined"
                size="small"
                endIcon={<ExpandMoreIcon />}
                onClick={(e) => setAnchor(e.currentTarget)}
                color={currentStatus === 'DELETED' ? 'error' : 'inherit'}
                disabled={isPending}
                aria-label={`Status: ${STATUS_LABELS[currentStatus]}`}
            >
                {STATUS_LABELS[currentStatus]}
            </Button>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                {currentStatus !== 'ACTIVE' && (
                    <MenuItem onClick={() => handleAction('ACTIVE')}>
                        <RestoreIcon fontSize="small" sx={{ mr: 1 }} /> Restore to Active
                    </MenuItem>
                )}
                {currentStatus !== 'ARCHIVED' && (
                    <MenuItem onClick={() => handleAction('ARCHIVED')}>
                        <ArchiveIcon fontSize="small" sx={{ mr: 1 }} /> Archive
                    </MenuItem>
                )}
                {currentStatus !== 'DELETED' && (
                    <MenuItem onClick={() => handleAction('DELETED')} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                )}
            </Menu>
            <ErrorSnackbar message={error} onClose={clearError} />
        </>
    )
}
