'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid, Autocomplete, Chip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { updateSceneAction } from '@/actions/productionActions'
import { Scene } from '@prisma/client'

export default function EditSceneForm({
                                          scene,
                                          projectId,
                                          projectName,
                                      }: {
    scene: Scene
    projectId: string
    projectName: string
}) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [keywords, setKeywords] = useState<string[]>(scene.keywords ?? [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitting(true)
        const formData = new FormData(e.currentTarget)
        formData.set('keywords', JSON.stringify(keywords))
        try {
            await updateSceneAction(scene.id, projectId, formData)
        } catch {
            // redirect happens in server action
        }
        setSubmitting(false)
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {projectName} / Scenes / Scene {scene.sceneNumber} / Edit
            </Typography>

            <Typography variant="h4" sx={{ mb: 3 }}>
                Edit Scene {scene.sceneNumber}
            </Typography>

            <form onSubmit={handleSubmit}>
                <Card sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <EditIcon color="primary" />
                            <Typography variant="h6">Scene Details</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
                            <Grid container spacing={2}>
                                <Grid size={4}>
                                    <TextField
                                        name="sceneNumber"
                                        label="Scene Number"
                                        type="number"
                                        defaultValue={scene.sceneNumber}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid size={4}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Int / Ext</InputLabel>
                                        <Select
                                            name="intExt"
                                            label="Int / Ext"
                                            defaultValue={scene.intExt ?? ''}
                                        >
                                            <MenuItem value="INT">INT</MenuItem>
                                            <MenuItem value="EXT">EXT</MenuItem>
                                            <MenuItem value="INT_EXT">INT/EXT</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={4}>
                                    <TextField
                                        name="sceneTimeOfDay"
                                        label="Time of Day"
                                        defaultValue={scene.sceneTimeOfDay ?? ''}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>

                            <TextField
                                name="sceneLocation"
                                label="Scene Location"
                                defaultValue={scene.sceneLocation}
                                required
                                fullWidth
                            />

                            <TextField
                                name="scriptSection"
                                label="Script Content"
                                defaultValue={scene.scriptSection}
                                required
                                fullWidth
                                multiline
                                rows={6}
                            />

                            <Autocomplete
                                multiple
                                freeSolo
                                options={[]}
                                value={keywords}
                                onChange={(_, newValue) => setKeywords(newValue)}
                                renderTags={(value, getTagProps) =>
                                    value.map((kw, index) => (
                                        <Chip
                                            label={kw}
                                            size="small"
                                            {...getTagProps({ index })}
                                            key={kw}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Keywords"
                                        placeholder="Type a keyword and press Enter..."
                                        helperText="Auto-generated keywords shown above. Add or remove as needed."
                                    />
                                )}
                            />
                        </Box>
                    </CardContent>
                </Card>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => router.push(`/productions/${projectId}/scenes/${scene.id}`)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Box>
            </form>
        </Box>
    )
}