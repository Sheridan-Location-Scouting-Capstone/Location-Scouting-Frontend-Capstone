'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Box,
    Card,
    Chip,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import { deleteSceneAction } from '@/actions/productionActions'
import { useActionRunner } from '@/hooks/useActionRunner'
import { formatIntExt } from '@/lib/format'
import ErrorSnackbar from '@/components/common/ErrorSnackbar'

type SceneRow = {
    id: string
    sceneNumber: number
    intExt: string | null
    sceneLocation: string
    sceneTimeOfDay: string | null
    scriptSection: string
}

export function filterScenes<T extends SceneRow>(scenes: T[], search: string) {
    if (!search) return scenes
    const query = search.toLowerCase()
    return scenes.filter(
        (scene) =>
            scene.sceneLocation.toLowerCase().includes(query) ||
            scene.sceneNumber.toString().includes(query) ||
            scene.scriptSection.toLowerCase().includes(query)
    )
}

export default function SceneTable({ scenes, projectId }: { scenes: SceneRow[]; projectId: string }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
    const [menuSceneId, setMenuSceneId] = useState<string | null>(null)
    const { run, error, clearError } = useActionRunner()

    const filtered = useMemo(() => filterScenes(scenes, search), [scenes, search])
    const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    const sceneUrl = (sceneId: string) => `/productions/${projectId}/scenes/${sceneId}`

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sceneId: string) => {
        event.stopPropagation()
        setMenuAnchor(event.currentTarget)
        setMenuSceneId(sceneId)
    }

    const handleMenuClose = () => {
        setMenuAnchor(null)
        setMenuSceneId(null)
    }

    const handleDelete = () => {
        if (menuSceneId) {
            const sceneId = menuSceneId
            run(() => deleteSceneAction(sceneId, projectId))
        }
        handleMenuClose()
    }

    return (
        <Box>
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
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        },
                        htmlInput: { 'aria-label': 'Search scenes' },
                    }}
                />
            </Card>

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
                                    <TableRow key={scene.id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(sceneUrl(scene.id))}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{scene.sceneNumber}</Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600} color="primary">{scene.sceneLocation}</Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            >
                                                {scene.scriptSection}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">{scene.sceneTimeOfDay || '—'}</Typography>
                                        </TableCell>

                                        <TableCell>
                                            {scene.intExt ? <Chip label={formatIntExt(scene.intExt)} size="small" variant="outlined" /> : '—'}
                                        </TableCell>

                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                aria-label={`More actions for scene ${scene.sceneNumber}`}
                                                onClick={(e) => handleMenuOpen(e, scene.id)}
                                            >
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                component={Link}
                                                href={`${sceneUrl(scene.id)}/edit`}
                                                aria-label={`Edit scene ${scene.sceneNumber}`}
                                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
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

            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
                <MenuItem onClick={handleDelete}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
            </Menu>

            <ErrorSnackbar message={error} onClose={clearError} />
        </Box>
    )
}
