import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CandidateTable, { CandidateRow, filterCandidates } from '@/components/candidates/CandidateTable'
import { removeCandidateAction, toggleCandidateSelectedAction } from '@/actions/candidateActions'
import { ErrorCode } from '@/schemas/result'

vi.mock('@/actions/candidateActions', () => ({
    removeCandidateAction: vi.fn(),
    toggleCandidateSelectedAction: vi.fn(),
}))

const candidate = (id: string, name: string, overrides: Partial<CandidateRow> = {}): CandidateRow => ({
    id,
    selected: false,
    thumbnailUrl: null,
    matchScore: null,
    location: { id: `loc-${id}`, name, address: '1 Main St', city: 'Toronto', province: 'ON', keywords: [], latitude: null, longitude: null },
    ...overrides,
})

const candidates = [
    candidate('c1', 'Brick Alley', { matchScore: 0.85 }),
    candidate('c2', 'Lake House', { selected: true }),
]

describe('filterCandidates', () => {
    it('should float selected candidates to the top', () => {
        expect(filterCandidates(candidates, '', []).map((c) => c.id)).toEqual(['c2', 'c1'])
    })

    it('should filter by search text', () => {
        expect(filterCandidates(candidates, 'brick', []).map((c) => c.id)).toEqual(['c1'])
    })
})

describe('CandidateTable', () => {
    it('should show the match score, or "Manual" for candidates without one', () => {
        render(<CandidateTable candidates={candidates} sceneId="s1" projectId="p1" />)
        expect(screen.getByRole('meter', { name: 'Match score' })).toHaveAttribute('aria-valuenow', '85')
        expect(screen.getByText('Manual')).toBeInTheDocument()
    })

    it('should select a candidate through the status chip', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(toggleCandidateSelectedAction).mockResolvedValue({ success: true, data: {} as never })
        render(<CandidateTable candidates={candidates} sceneId="s1" projectId="p1" />)

        // Act
        await user.click(screen.getByText('Candidate'))

        // Assert
        await waitFor(() => expect(toggleCandidateSelectedAction).toHaveBeenCalledWith('c1', true, 's1', 'p1'))
    })

    it('should report a failed selection and revert the chip', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(toggleCandidateSelectedAction).mockResolvedValue({ success: false, code: ErrorCode.NOT_FOUND, error: 'Candidate not found' })
        render(<CandidateTable candidates={candidates} sceneId="s1" projectId="p1" />)

        // Act
        await user.click(screen.getByText('Candidate'))

        // Assert
        expect(await screen.findByText('Candidate not found')).toBeInTheDocument()
        // React drops the optimistic flip once the transition settles
        await waitFor(() => expect(screen.getAllByText('Selected')).toHaveLength(1))
        expect(screen.getByText('Candidate')).toBeInTheDocument()
    })

    it('should report a failed removal', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(removeCandidateAction).mockResolvedValue({ success: false, code: ErrorCode.NOT_FOUND, error: 'Candidate not found' })
        render(<CandidateTable candidates={candidates} sceneId="s1" projectId="p1" />)

        // Act
        await user.click(screen.getByRole('button', { name: 'More actions for Brick Alley' }))
        await user.click(screen.getByRole('menuitem', { name: 'Remove Candidate' }))

        // Assert
        expect(await screen.findByText('Candidate not found')).toBeInTheDocument()
        expect(removeCandidateAction).toHaveBeenCalledWith('c1', 's1', 'p1')
    })

    it('should offer to add candidates or get recommendations when there are none', async () => {
        // Arrange
        const user = userEvent.setup()
        const onAdd = vi.fn()
        const onRecommend = vi.fn()
        render(<CandidateTable candidates={[]} sceneId="s1" projectId="p1" onAddCandidateAction={onAdd} onGetRecommendationsAction={onRecommend} />)

        // Act
        await user.click(screen.getByRole('button', { name: 'Add Candidate' }))
        await user.click(screen.getByRole('button', { name: 'Get Recommendations' }))

        // Assert
        expect(onAdd).toHaveBeenCalled()
        expect(onRecommend).toHaveBeenCalled()
    })
})
