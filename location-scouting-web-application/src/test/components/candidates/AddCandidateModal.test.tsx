import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddCandidateModal, { LocationForPicker } from '@/components/candidates/AddCandidateModal'
import { getLocationAction } from '@/actions/locationActions'
import { addCandidateAction } from '@/actions/candidateActions'
import { ErrorCode } from '@/schemas/result'

vi.mock('@/actions/locationActions', () => ({ getLocationAction: vi.fn() }))
vi.mock('@/actions/candidateActions', () => ({ addCandidateAction: vi.fn() }))

const locations: LocationForPicker[] = [
    { id: 'loc-1', name: 'Brick Alley', address: '1 Main St', city: 'Toronto', province: 'ON', keywords: ['brick'], photos: [] },
    { id: 'loc-2', name: 'Lake House', address: '2 Lake Rd', city: 'Muskoka', province: 'ON', keywords: [], photos: [] },
]

const fullLocation = (photos: { id: string; url: string; name: string | null; displayOrder: number }[]) =>
    ({ id: 'loc-1', photos }) as unknown as Awaited<ReturnType<typeof getLocationAction>>

function renderModal(onClose = vi.fn()) {
    render(
        <AddCandidateModal
            open
            onCloseAction={onClose}
            locations={locations}
            candidatedLocationIds={['loc-2']}
            sceneId="s1"
            projectId="p1"
        />
    )
    return onClose
}

describe('AddCandidateModal', () => {
    it('should mark locations that are already candidates', () => {
        renderModal()
        const options = screen.getAllByTestId('candidate-location-option')
        expect(options[1]).toHaveAttribute('aria-disabled', 'true')
        expect(options[1]).toHaveTextContent('Already Added')
    })

    it('should add a location with no photos straight away and close', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(getLocationAction).mockResolvedValue(fullLocation([]))
        vi.mocked(addCandidateAction).mockResolvedValue({ success: true, data: {} as never })
        const onClose = renderModal()

        // Act
        await user.click(screen.getByText('Brick Alley'))

        // Assert
        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(addCandidateAction).toHaveBeenCalledWith('s1', 'loc-1', 'p1', [])
    })

    it('should stay open and explain why when adding fails', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(getLocationAction).mockResolvedValue(fullLocation([]))
        vi.mocked(addCandidateAction).mockResolvedValue({ success: false, code: ErrorCode.ALREADY_EXISTS, error: 'Candidate already exists for this scene' })
        const onClose = renderModal()

        // Act
        await user.click(screen.getByText('Brick Alley'))

        // Assert
        expect(await screen.findByText('Candidate already exists for this scene')).toBeInTheDocument()
        expect(onClose).not.toHaveBeenCalled()
    })

    it('should explain when the chosen location can no longer be loaded', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(getLocationAction).mockResolvedValue(null)
        renderModal()

        // Act
        await user.click(screen.getByText('Brick Alley'))

        // Assert
        expect(await screen.findByText('That location is no longer available.')).toBeInTheDocument()
        expect(addCandidateAction).not.toHaveBeenCalled()
    })

    it('should let the user pick photos when the location has them', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(getLocationAction).mockResolvedValue(fullLocation([
            { id: 'ph1', url: 'http://minio/1.jpg', name: 'Front', displayOrder: 0 },
            { id: 'ph2', url: 'http://minio/2.jpg', name: 'Back', displayOrder: 1 },
        ]))
        vi.mocked(addCandidateAction).mockResolvedValue({ success: true, data: {} as never })
        const onClose = renderModal()
        await user.click(screen.getByText('Brick Alley'))

        // Act
        await user.click(await screen.findByAltText('Back'))
        await user.click(screen.getByRole('button', { name: 'Add Candidate (1 photo)' }))

        // Assert
        await waitFor(() => expect(addCandidateAction).toHaveBeenCalledWith('s1', 'loc-1', 'p1', ['ph2']))
        expect(onClose).toHaveBeenCalled()
    })
})
