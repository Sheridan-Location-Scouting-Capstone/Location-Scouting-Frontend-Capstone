import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SceneTable, { filterScenes } from '@/components/scenes/SceneTable'
import { deleteSceneAction } from '@/actions/productionActions'
import { ErrorCode } from '@/schemas/result'

vi.mock('@/actions/productionActions', () => ({
    deleteSceneAction: vi.fn(),
}))

const scenes = [
    { id: 's1', sceneNumber: 1, intExt: 'INT_EXT', sceneLocation: 'KITCHEN', sceneTimeOfDay: 'Day', scriptSection: 'Breakfast.' },
    { id: 's12', sceneNumber: 12, intExt: null, sceneLocation: 'PARK', sceneTimeOfDay: null, scriptSection: 'A walk by the lake.' },
]

describe('filterScenes', () => {
    it('should search location, scene number and script text', () => {
        expect(filterScenes(scenes, 'kitchen').map((s) => s.id)).toEqual(['s1'])
        expect(filterScenes(scenes, '12').map((s) => s.id)).toEqual(['s12'])
        expect(filterScenes(scenes, 'LAKE').map((s) => s.id)).toEqual(['s12'])
    })
})

describe('SceneTable', () => {
    it('should link each scene\'s edit button to the scene edit page', () => {
        render(<SceneTable scenes={scenes} projectId="p1" />)
        expect(screen.getByRole('link', { name: 'Edit scene 1' })).toHaveAttribute('href', '/productions/p1/scenes/s1/edit')
    })

    it('should show INT/EXT, and a dash when a scene has none', () => {
        render(<SceneTable scenes={scenes} projectId="p1" />)
        expect(screen.getByText('INT/EXT')).toBeInTheDocument()
        expect(screen.getAllByText('—')).toHaveLength(2)
    })

    it('should report a failed delete', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(deleteSceneAction).mockResolvedValue({ success: false, code: ErrorCode.NOT_FOUND, error: 'Scene not found' })
        render(<SceneTable scenes={scenes} projectId="p1" />)

        // Act
        await user.click(screen.getByRole('button', { name: 'More actions for scene 1' }))
        await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

        // Assert
        expect(await screen.findByText('Scene not found')).toBeInTheDocument()
        expect(deleteSceneAction).toHaveBeenCalledWith('s1', 'p1')
    })
})
