'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Typography,
  Chip, Menu, MenuItem,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import {deleteSceneAction} from "@/actions/productionActions";

type Scene = {
  id: string
  sceneNumber: number
  intExt: string | null
  sceneLocation: string
  sceneTimeOfDay: string | null
  scriptSection: string
  projectId: string
  createdAt: Date
}

export default function SceneTable({ scenes, projectId }: { scenes: Scene[]; projectId: string }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuSceneId, setMenuSceneId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return scenes
    const q = search.toLowerCase()
    return scenes.filter(
      (s) =>
        s.sceneLocation.toLowerCase().includes(q) ||
        s.sceneNumber.toString().includes(q) ||
        s.scriptSection.toLowerCase().includes(q)
    )
  }, [scenes, search])

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sceneId: string) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuSceneId(sceneId)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setMenuSceneId(null)
  }

  const handleDelete =  async () => {
    if(menuSceneId) {
      await deleteSceneAction(menuSceneId, projectId)
    }
    handleMenuClose()
  }

  return (
    <Box>
      {/* Search */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <TextField
          placeholder="Search scenes..."
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Scene #</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Time of Day</TableCell>
                <TableCell>Int / Ext</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      {scenes.length === 0
                        ? 'No scenes yet. Add your first scene to get started!'
                        : 'No scenes match your search.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((scene) => (
                  <TableRow
                    key={scene.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/productions/${projectId}/scenes/${scene.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {scene.sceneNumber}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {scene.sceneLocation}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          maxWidth: 350,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {scene.scriptSection}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {scene.sceneTimeOfDay || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {scene.intExt ? (
                        <Chip
                          label={scene.intExt.replace('_', '/')}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, scene.id)}>
                        <MoreVertIcon fontSize="small"/>
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/productions/${projectId}/scenes/${scene.id}`)
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {filtered.length > rowsPerPage && (
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        )}
      </Card>

      {/* Context menu */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleDelete()}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  )
}
