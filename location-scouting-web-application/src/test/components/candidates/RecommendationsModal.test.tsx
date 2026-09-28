import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecommendationsModal from '@/components/candidates/RecommendationsModal'
import { addCandidateAction, getRecommendationsAction } from '@/actions/candidateActions'
import { ErrorCode } from '@/schemas/result'

vi.mock('@/actions/candidateActions', () => ({
    addCandidateAction: vi.fn(),
    getRecommendationsAction: vi.fn(),
}))

const recommendations = [
    { locationId: 'loc-1', locationName: 'Brick Alley', score: 0.9 },
    { locationId: 'loc-2', locationName: 'Lake House', score: 0.5 },
]

function renderModal() {
    render(<RecommendationsModal open onCloseAction={vi.fn()} sceneId="s1" projectId="p1" candidatedLocationIds={['loc-2']} />)
}

describe('RecommendationsModal', () => {
    it('should list recommendations with their match and whether they are already candidates', async () => {
        // Arrange
        vi.mocked(getRecommendationsAction).mockResolvedValue({ success: true, data: recommendations })

        // Act
        renderModal()

        // Assert
        expect(await screen.findByText('Brick Alley')).toBeInTheDocument()
        expect(screen.getByText('90% match')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Add Brick Alley' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Add Lake House' })).not.toBeInTheDocument()
    })

    it('should mark a location as added once adding succeeds', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(getRecommendationsAction).mockResolvedValue({ success: true, data: recommendations })
        vi.mocked(addCandidateAction).mockResolvedValue({ success: true, data: {} as never })
        renderModal()

        // Act
        await user.click(await screen.findByRole('button', { name: 'Add Brick Alley' }))

        // Assert
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Add Brick Alley' })).not.toBeInTheDocument())
        expect(screen.getAllByText('Already added')).toHaveLength(2)
    })

    it('should not mark a location as added when adding fails', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(getRecommendationsAction).mockResolvedValue({ success: true, data: recommendations })
        vi.mocked(addCandidateAction).mockResolvedValue({ success: false, code: ErrorCode.NOT_FOUND, error: 'Scene or Location not found for this candidate' })
        renderModal()

        // Act
        await user.click(await screen.findByRole('button', { name: 'Add Brick Alley' }))

        // Assert
        expect(await screen.findByText('Scene or Location not found for this candidate')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Add Brick Alley' })).toBeInTheDocument()
    })

    it('should say when recommendations could not be loaded, rather than that there are none', async () => {
        // Arrange
        vi.mocked(getRecommendationsAction).mockResolvedValue({ success: false, code: ErrorCode.NOT_FOUND, error: 'Scene not found: s1' })

        // Act
        renderModal()

        // Assert
        expect(await screen.findByText(/Couldn.t load recommendations: Scene not found/)).toBeInTheDocument()
        expect(screen.queryByText(/No recommendations found/)).not.toBeInTheDocument()
    })
})
