import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationPhotoGallery, { applyPendingOrder, GalleryPhoto } from '@/components/locations/LocationPhotoGallery'
import { addPhotosAction, deletePhotoAction, updatePhotoNameAction } from '@/actions/locationActions'
import { ErrorCode } from '@/schemas/result'

vi.mock('@/actions/locationActions', () => ({
    addPhotosAction: vi.fn(),
    deletePhotoAction: vi.fn(),
    updatePhotoDisplayOrderAction: vi.fn(),
    updatePhotoNameAction: vi.fn(),
}))

const photos: GalleryPhoto[] = [
    { id: 'p1', name: 'Front', url: 'http://minio/front.jpg', displayOrder: 0 },
    { id: 'p2', name: 'Back', url: 'http://minio/back.jpg', displayOrder: 1 },
    { id: 'p3', name: 'Side', url: 'http://minio/side.jpg', displayOrder: 2 },
]

const preview = () => screen.getByTestId('gallery-preview')

describe('applyPendingOrder', () => {
    it('should apply a dragged order over the server order', () => {
        expect(applyPendingOrder(photos, ['p3', 'p1', 'p2']).map((p) => p.id)).toEqual(['p3', 'p1', 'p2'])
    })

    it('should fall back to the server order once the photo set changes', () => {
        const afterDelete = photos.slice(0, 2)
        expect(applyPendingOrder(afterDelete, ['p3', 'p1', 'p2'])).toBe(afterDelete)
        expect(applyPendingOrder(photos, ['p1', 'p2', 'p9'])).toBe(photos)
    })

    it('should use the server order when nothing was dragged', () => {
        expect(applyPendingOrder(photos, null)).toBe(photos)
    })
})

describe('LocationPhotoGallery', () => {
    it('should preview the first photo, then whichever thumbnail is clicked', async () => {
        // Arrange
        const user = userEvent.setup()
        render(<LocationPhotoGallery photos={photos} locationId="loc-1" />)
        expect(preview()).toHaveAttribute('src', 'http://minio/front.jpg')

        // Act
        await user.click(screen.getByAltText('Side'))

        // Assert
        expect(preview()).toHaveAttribute('src', 'http://minio/side.jpg')
    })

    it('should keep previewing the selected photo when the photos arrive in a new order', async () => {
        // Arrange - select "Side" (last), then the server returns the list reversed (e.g. after a drag is saved)
        const user = userEvent.setup()
        const { rerender } = render(<LocationPhotoGallery photos={photos} locationId="loc-1" />)
        await user.click(screen.getByAltText('Side'))

        // Act
        rerender(<LocationPhotoGallery photos={[photos[2], photos[1], photos[0]]} locationId="loc-1" />)

        // Assert - selection follows the photo, not its old position
        expect(preview()).toHaveAttribute('src', 'http://minio/side.jpg')
        const sideThumbnail = screen.getAllByTestId('gallery-thumbnail').find((thumbnail) => within(thumbnail).queryByAltText('Side'))
        expect(sideThumbnail).toHaveAttribute('aria-selected', 'true')
    })

    it('should save a renamed photo exactly once when Enter is pressed', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(updatePhotoNameAction).mockResolvedValue(undefined)
        render(<LocationPhotoGallery photos={photos} locationId="loc-1" />)
        await user.click(screen.getByRole('button', { name: 'Rename photo' }))
        const nameInput = screen.getByLabelText('Photo name')
        await user.clear(nameInput)

        // Act
        await user.type(nameInput, 'Front entrance{Enter}')

        // Assert
        await waitFor(() => expect(updatePhotoNameAction).toHaveBeenCalledTimes(1))
        expect(updatePhotoNameAction).toHaveBeenCalledWith('p1', 'Front entrance', 'loc-1')
        expect(screen.queryByLabelText('Photo name')).not.toBeInTheDocument()
    })

    it('should not save when a rename is cancelled with Escape', async () => {
        // Arrange
        const user = userEvent.setup()
        render(<LocationPhotoGallery photos={photos} locationId="loc-1" />)
        await user.click(screen.getByRole('button', { name: 'Rename photo' }))

        // Act
        await user.type(screen.getByLabelText('Photo name'), ' draft{Escape}')

        // Assert
        expect(updatePhotoNameAction).not.toHaveBeenCalled()
    })

    it('should show the error and keep the photo when a delete fails', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(deletePhotoAction).mockResolvedValue({ success: false, code: ErrorCode.NOT_FOUND, error: 'Location not found' })
        render(<LocationPhotoGallery photos={photos} locationId="loc-1" />)

        // Act
        await user.click(screen.getByRole('button', { name: 'Delete photo' }))

        // Assert
        expect(await screen.findByText('Location not found')).toBeInTheDocument()
        expect(preview()).toHaveAttribute('src', 'http://minio/front.jpg')
    })

    it('should upload chosen files, and allow the same file to be chosen again', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(addPhotosAction).mockResolvedValue(undefined)
        render(<LocationPhotoGallery photos={photos} locationId="loc-1" />)
        const input = screen.getByTestId('gallery-upload-input') as HTMLInputElement
        const file = new File(['img'], 'new.jpg', { type: 'image/jpeg' })

        // Act
        await user.upload(input, file)

        // Assert
        await waitFor(() => expect(addPhotosAction).toHaveBeenCalledTimes(1))
        const [locationId, formData] = vi.mocked(addPhotosAction).mock.calls[0]
        expect(locationId).toBe('loc-1')
        expect(formData.getAll('photos')).toEqual([file])
        expect(input.value).toBe('')
    })
})
