import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationForm, { LocationFormValues } from '@/components/locations/LocationForm'
import { createLocationAction, updateLocationAction } from '@/actions/locationActions'
import { ErrorCode } from '@/schemas/result'
import { redirected } from '@/test/components/helpers'

vi.mock('@/actions/locationActions', () => ({
    createLocationAction: vi.fn(),
    updateLocationAction: vi.fn(),
}))

const existingLocation: LocationFormValues = {
    id: 'loc-1',
    name: 'Downtown Alley',
    address: '123 Main St',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5V 1A1',
    country: 'Canada',
    notes: 'Great light',
    keywords: ['brick', 'alley'],
    contactName: 'Pat',
    contactPhone: '7057733685',
    contactEmail: 'pat@example.com',
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Location Name/), 'Fresh Spot')
    await user.type(screen.getByLabelText(/Street Address/), '1 Queen St')
    await user.type(screen.getByLabelText(/^City/), 'Toronto')
    await user.type(screen.getByLabelText(/^Province/), 'ON')
    await user.type(screen.getByLabelText(/Postal Code/), 'M5V 1A1')
}

function submittedFormData(mock: unknown, argIndex = 0) {
    const calls = vi.mocked(mock as (...args: unknown[]) => unknown).mock.calls
    return calls[0][argIndex] as FormData
}

describe('LocationForm', () => {
    describe('create mode', () => {
        it('should offer photo upload and an "Add Location" button', () => {
            render(<LocationForm />)

            expect(screen.getByRole('heading', { name: 'Upload Photos' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Add Location' })).toBeInTheDocument()
            expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/locations')
        })

        it('should submit the fields, tags and picked photos to createLocationAction', async () => {
            // Arrange
            const user = userEvent.setup()
            vi.mocked(createLocationAction).mockResolvedValue(redirected)
            render(<LocationForm />)
            await fillRequiredFields(user)
            await user.type(screen.getByLabelText('Tags'), 'rooftop{Enter}urban{Enter}')
            const photo = new File(['img'], 'roof.jpg', { type: 'image/jpeg' })
            await user.upload(screen.getByTestId('location-photo-input'), photo)
            await user.type(screen.getByLabelText('Name for roof.jpg'), 'Roof view')

            // Act
            await user.click(screen.getByRole('button', { name: 'Add Location' }))

            // Assert
            await waitFor(() => expect(createLocationAction).toHaveBeenCalledTimes(1))
            const formData = submittedFormData(createLocationAction)
            expect(formData.get('name')).toBe('Fresh Spot')
            expect(formData.get('keywords')).toBe('rooftop,urban')
            expect(formData.getAll('photos')).toEqual([photo])
            expect(formData.getAll('photoNames')).toEqual(['Roof view'])
        })

        it('should keep previews matched to their files when a photo is removed', async () => {
            // Arrange
            const user = userEvent.setup()
            vi.mocked(createLocationAction).mockResolvedValue(redirected)
            render(<LocationForm />)
            await fillRequiredFields(user)
            const first = new File(['1'], 'first.jpg', { type: 'image/jpeg' })
            const second = new File(['2'], 'second.jpg', { type: 'image/jpeg' })
            await user.upload(screen.getByTestId('location-photo-input'), [first, second])

            // Act
            await user.click(screen.getByRole('button', { name: 'Remove first.jpg' }))
            await user.click(screen.getByRole('button', { name: 'Add Location' }))

            // Assert
            expect(screen.queryByAltText('first.jpg')).not.toBeInTheDocument()
            expect(screen.getByAltText('second.jpg')).toBeInTheDocument()
            await waitFor(() => expect(createLocationAction).toHaveBeenCalled())
            expect(submittedFormData(createLocationAction).getAll('photos')).toEqual([second])
        })

        it('should show the server\'s message and field errors when creation fails', async () => {
            // Arrange
            const user = userEvent.setup()
            vi.mocked(createLocationAction).mockResolvedValue({
                success: false,
                code: ErrorCode.VALIDATION_FAILED,
                error: 'Invalid Input. Please fix the highlighted fields and try again.',
                fieldErrors: { contactEmail: ['Invalid email address'] },
            })
            render(<LocationForm />)
            await fillRequiredFields(user)

            // Act
            await user.click(screen.getByRole('button', { name: 'Add Location' }))

            // Assert
            expect(await screen.findByRole('alert')).toHaveTextContent('Invalid Input')
            expect(screen.getByText('Invalid email address')).toBeInTheDocument()
            // Nothing the user typed is lost
            expect(screen.getByLabelText(/Location Name/)).toHaveValue('Fresh Spot')
            expect(screen.getByRole('button', { name: 'Add Location' })).toBeEnabled()
        })

        it('should not submit an invalid phone number', async () => {
            // Arrange
            const user = userEvent.setup()
            render(<LocationForm />)
            await fillRequiredFields(user)
            await user.type(screen.getByLabelText('Phone'), '123')

            // Act
            await user.click(screen.getByRole('button', { name: 'Add Location' }))

            // Assert
            expect(screen.getByText('Invalid phone number')).toBeInTheDocument()
            expect(createLocationAction).not.toHaveBeenCalled()
        })

        it('should accept a formatted phone number', async () => {
            // Arrange
            const user = userEvent.setup()
            vi.mocked(createLocationAction).mockResolvedValue(redirected)
            render(<LocationForm />)
            await fillRequiredFields(user)
            await user.type(screen.getByLabelText('Phone'), '(705) 773-3685')

            // Act
            await user.click(screen.getByRole('button', { name: 'Add Location' }))

            // Assert
            await waitFor(() => expect(createLocationAction).toHaveBeenCalled())
            expect(submittedFormData(createLocationAction).get('contactPhone')).toBe('(705) 773-3685')
        })
    })

    describe('edit mode', () => {
        it('should prefill the location and not offer photo upload', () => {
            render(<LocationForm location={existingLocation} />)

            expect(screen.getByLabelText(/Location Name/)).toHaveValue('Downtown Alley')
            expect(screen.getByLabelText('Description')).toHaveValue('Great light')
            expect(screen.getByText('brick')).toBeInTheDocument()
            expect(screen.queryByRole('heading', { name: 'Upload Photos' })).not.toBeInTheDocument()
            expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/locations/loc-1')
        })

        it('should submit changes, including removed tags and cleared fields, to updateLocationAction', async () => {
            // Arrange
            const user = userEvent.setup()
            vi.mocked(updateLocationAction).mockResolvedValue(redirected)
            render(<LocationForm location={existingLocation} />)
            await user.clear(screen.getByLabelText('Description'))
            // Remove the "brick" tag with its chip's delete icon
            const brickChip = screen.getByText('brick').closest('.MuiChip-root') as HTMLElement
            await user.click(within(brickChip).getByTestId('CancelIcon'))

            // Act
            await user.click(screen.getByRole('button', { name: 'Save Changes' }))

            // Assert
            await waitFor(() => expect(updateLocationAction).toHaveBeenCalledTimes(1))
            const [locationId, formData] = vi.mocked(updateLocationAction).mock.calls[0]
            expect(locationId).toBe('loc-1')
            expect(formData.get('notes')).toBe('')
            expect(formData.get('keywords')).toBe('alley')
        })
    })
})
