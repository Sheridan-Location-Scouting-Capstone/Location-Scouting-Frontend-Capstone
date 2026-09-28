import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SceneForm from '@/components/scenes/SceneForm'
import { createSceneAction, updateSceneAction } from '@/actions/productionActions'
import { ErrorCode } from '@/schemas/result'
import { redirected } from '@/test/components/helpers'

vi.mock('@/actions/productionActions', () => ({
    createSceneAction: vi.fn(),
    updateSceneAction: vi.fn(),
}))

const scene = {
    id: 'scene-1',
    sceneNumber: 3,
    intExt: 'INT',
    sceneLocation: 'KITCHEN',
    sceneTimeOfDay: 'Night',
    scriptSection: 'A quiet kitchen.',
    keywords: ['kitchen', 'vintage'],
}

describe('SceneForm', () => {
    it('should create the scene in the given production', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(createSceneAction).mockResolvedValue(redirected)
        render(<SceneForm projectId="proj-1" />)
        await user.type(screen.getByLabelText(/Scene Number/), '7')
        await user.click(screen.getByRole('combobox', { name: /Int \/ Ext/ }))
        await user.click(screen.getByRole('option', { name: 'EXT' }))
        await user.type(screen.getByLabelText(/Time of Day/), 'Day')
        await user.type(screen.getByLabelText(/Scene Location/), 'PARK')
        await user.type(screen.getByLabelText(/Script Content/), 'A park bench.')

        // Act
        await user.click(screen.getByRole('button', { name: 'Add Scene' }))

        // Assert
        await waitFor(() => expect(createSceneAction).toHaveBeenCalledTimes(1))
        const formData = vi.mocked(createSceneAction).mock.calls[0][0]
        expect(formData.get('projectId')).toBe('proj-1')
        expect(formData.get('sceneNumber')).toBe('7')
        expect(formData.get('intExt')).toBe('EXT')
    })

    it('should not offer keyword editing for a new scene', () => {
        render(<SceneForm projectId="proj-1" />)
        expect(screen.queryByLabelText('Keywords')).not.toBeInTheDocument()
    })

    it('should send the edited keyword list when saving a scene', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(updateSceneAction).mockResolvedValue(redirected)
        render(<SceneForm projectId="proj-1" scene={scene} />)
        await user.type(screen.getByLabelText('Keywords'), 'lamp{Enter}')

        // Act
        await user.click(screen.getByRole('button', { name: 'Save Changes' }))

        // Assert
        await waitFor(() => expect(updateSceneAction).toHaveBeenCalledTimes(1))
        const [sceneId, projectId, formData] = vi.mocked(updateSceneAction).mock.calls[0]
        expect(sceneId).toBe('scene-1')
        expect(projectId).toBe('proj-1')
        expect(JSON.parse(formData.get('keywords') as string)).toEqual(['kitchen', 'vintage', 'lamp'])
    })

    it('should show a field error returned by the server', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(updateSceneAction).mockResolvedValue({
            success: false,
            code: ErrorCode.VALIDATION_FAILED,
            error: 'Invalid scene data',
            fieldErrors: { sceneLocation: ['Scene location is required'] },
        })
        render(<SceneForm projectId="proj-1" scene={scene} />)

        // Act
        await user.click(screen.getByRole('button', { name: 'Save Changes' }))

        // Assert
        expect(await screen.findByText('Scene location is required')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid scene data')
    })
})
