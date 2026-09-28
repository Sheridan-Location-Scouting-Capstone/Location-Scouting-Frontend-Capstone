'use client'

import { useState } from 'react'
import {
    Autocomplete,
    Box,
    Chip,
    FormControl,
    FormHelperText,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import EditIcon from '@mui/icons-material/Edit'
import { createSceneAction, updateSceneAction } from '@/actions/productionActions'
import { useFormAction } from '@/hooks/useFormAction'
import { fieldError, fieldErrorProps } from '@/lib/actionResult'
import FormSection from '@/components/common/FormSection'
import FormActions from '@/components/common/FormActions'
import FormErrorAlert from '@/components/common/FormErrorAlert'

export type SceneFormValues = {
    id: string
    sceneNumber: number
    intExt: string | null
    sceneLocation: string
    sceneTimeOfDay: string | null
    scriptSection: string
    keywords: string[]
}

type SceneFormProps = {
    projectId: string
    /** Edit this scene; creates a new scene in the project when omitted */
    scene?: SceneFormValues
}

export default function SceneForm({ projectId, scene }: SceneFormProps) {
    const [keywords, setKeywords] = useState<string[]>(scene?.keywords ?? [])

    const { failure, submit, isPending } = useFormAction((formData) =>
        scene ? updateSceneAction(scene.id, projectId, formData) : createSceneAction(formData)
    )

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        if (scene) {
            formData.set('keywords', JSON.stringify(keywords))
        } else {
            formData.set('projectId', projectId)
        }
        submit(formData)
    }

    const intExtError = fieldError(failure, 'intExt')
    const sceneUrl = scene ? `/productions/${projectId}/scenes/${scene.id}` : `/productions/${projectId}`

    return (
        <form onSubmit={handleSubmit}>
            <FormErrorAlert failure={failure} />

            <FormSection icon={scene ? <EditIcon color="primary" /> : <MovieIcon color="primary" />} title="Scene Details">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
                    <Grid container spacing={2}>
                        <Grid size={4}>
                            <TextField
                                name="sceneNumber"
                                label="Scene Number"
                                type="number"
                                required
                                fullWidth
                                defaultValue={scene?.sceneNumber}
                                {...fieldErrorProps(failure, 'sceneNumber')}
                            />
                        </Grid>
                        <Grid size={4}>
                            <FormControl fullWidth required error={Boolean(intExtError)}>
                                <InputLabel id="scene-int-ext-label">Int / Ext</InputLabel>
                                <Select name="intExt" labelId="scene-int-ext-label" label="Int / Ext" defaultValue={scene?.intExt ?? ''}>
                                    <MenuItem value="INT">INT</MenuItem>
                                    <MenuItem value="EXT">EXT</MenuItem>
                                    <MenuItem value="INT_EXT">INT/EXT</MenuItem>
                                </Select>
                                {intExtError && <FormHelperText>{intExtError}</FormHelperText>}
                            </FormControl>
                        </Grid>
                        <Grid size={4}>
                            <TextField
                                name="sceneTimeOfDay"
                                label="Time of Day"
                                required
                                fullWidth
                                placeholder="Day, Night, Dawn..."
                                defaultValue={scene?.sceneTimeOfDay ?? ''}
                                {...fieldErrorProps(failure, 'sceneTimeOfDay')}
                            />
                        </Grid>
                    </Grid>

                    <TextField
                        name="sceneLocation"
                        label="Scene Location"
                        required
                        fullWidth
                        placeholder="e.g. KITCHEN, PARK BENCH, OFFICE"
                        defaultValue={scene?.sceneLocation}
                        {...fieldErrorProps(failure, 'sceneLocation')}
                    />

                    <TextField
                        name="scriptSection"
                        label="Script Content"
                        required
                        fullWidth
                        multiline
                        rows={6}
                        placeholder="Paste the scene content from the screenplay..."
                        defaultValue={scene?.scriptSection}
                        {...fieldErrorProps(failure, 'scriptSection')}
                    />

                    {/* Keywords are generated when a scene is created, so they can only be edited afterwards */}
                    {scene && (
                        <Autocomplete
                            multiple
                            freeSolo
                            options={[] as string[]}
                            value={keywords}
                            onChange={(_, value) => setKeywords(value)}
                            renderValue={(value, getItemProps) =>
                                value.map((keyword, index) => (
                                    <Chip label={keyword} size="small" {...getItemProps({ index })} key={keyword} color="primary" variant="outlined" />
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
                    )}
                </Box>
            </FormSection>

            <FormActions
                cancelHref={sceneUrl}
                submitLabel={scene ? 'Save Changes' : 'Add Scene'}
                pendingLabel={scene ? 'Saving...' : 'Creating...'}
                isPending={isPending}
            />
        </form>
    )
}
