import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationKeywordChips from '@/components/locations/LocationKeywordChips'
import { removeKeywordAction } from '@/actions/locationActions'
import { ErrorCode } from '@/schemas/result'

vi.mock('@/actions/locationActions', () => ({
    removeKeywordAction: vi.fn(),
}))

async function removeChip(user: ReturnType<typeof userEvent.setup>, label: string) {
    const chip = screen.getByText(label).closest('.MuiChip-root') as HTMLElement
    await user.click(within(chip).getByTestId('CancelIcon'))
}

describe('LocationKeywordChips', () => {
    it('should remove a tag once the server confirms', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(removeKeywordAction).mockResolvedValue(undefined)
        render(<LocationKeywordChips locationId="loc-1" initialKeywords={['brick', 'alley']} />)

        // Act
        await removeChip(user, 'brick')

        // Assert
        await waitFor(() => expect(screen.queryByText('brick')).not.toBeInTheDocument())
        expect(removeKeywordAction).toHaveBeenCalledWith('loc-1', 'brick')
        expect(screen.getByText('alley')).toBeInTheDocument()
    })

    it('should keep the tag and show the error when removal fails', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(removeKeywordAction).mockResolvedValue({ success: false, code: ErrorCode.NOT_FOUND, error: 'Location not found' })
        render(<LocationKeywordChips locationId="loc-1" initialKeywords={['brick']} />)

        // Act
        await removeChip(user, 'brick')

        // Assert
        expect(await screen.findByText('Location not found')).toBeInTheDocument()
        expect(screen.getByText('brick')).toBeInTheDocument()
    })

    it('should say when there are no tags', () => {
        render(<LocationKeywordChips locationId="loc-1" initialKeywords={[]} />)
        expect(screen.getByText('No tags')).toBeInTheDocument()
    })
})
