'use client'

import { useState } from 'react'
import { Button, Menu, MenuItem } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ArchiveIcon from '@mui/icons-material/Archive'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import { updateLocationStatusAction } from '@/actions/locationActions'

export default function LocationStatusActions({
  locationId,
  currentStatus,
}: {
  locationId: string
  currentStatus: string
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const handleAction = async (status: 'ACTIVE' | 'ARCHIVED' | 'DELETED') => {
    setAnchor(null)
    await updateLocationStatusAction(locationId, status)
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        color={currentStatus === 'DELETED' ? 'error' : 'inherit'}
      >
        {currentStatus === 'ACTIVE' ? 'Active' : currentStatus === 'ARCHIVED' ? 'Archived' : 'Deleted'}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
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
    </>
  )
}
