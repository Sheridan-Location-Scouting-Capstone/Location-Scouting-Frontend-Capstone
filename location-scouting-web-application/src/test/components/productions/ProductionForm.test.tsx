import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductionForm from '@/components/productions/ProductionForm'
import { createProjectAction, updateProjectAction } from '@/actions/productionActions'
import { ErrorCode } from '@/schemas/result'
import { redirected } from '@/test/components/helpers'

vi.mock('@/actions/productionActions', () => ({
    createProjectAction: vi.fn(),
    updateProjectAction: vi.fn(),
}))

const project = {
    id: 'proj-1',
    name: 'My Film',
    address: '456 Film St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V5K 0A1',
    country: 'Canada',
}

describe('ProductionForm', () => {
    it('should create a production from the entered details', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(createProjectAction).mockResolvedValue(redirected)
        render(<ProductionForm />)
        await user.type(screen.getByLabelText(/Production Name/), 'New Film')
        await user.type(screen.getByLabelText(/Street Address/), '1 Studio Rd')
        await user.type(screen.getByLabelText(/^City/), 'Toronto')
        await user.type(screen.getByLabelText(/^Province/), 'ON')
        await user.type(screen.getByLabelText(/Postal Code/), 'M5V 1A1')

        // Act
        await user.click(screen.getByRole('button', { name: 'Add Production' }))

        // Assert
        await waitFor(() => expect(createProjectAction).toHaveBeenCalledTimes(1))
        const formData = vi.mocked(createProjectAction).mock.calls[0][0]
        expect(formData.get('name')).toBe('New Film')
        expect(formData.get('country')).toBe('Canada')
    })

    it('should show field errors returned by the server', async () => {
        // Arrange
        const user = userEvent.setup()
        vi.mocked(updateProjectAction).mockResolvedValue({
            success: false,
            code: ErrorCode.VALIDATION_FAILED,
            error: 'Invalid project data',
            fieldErrors: { name: ['Project name is required'] },
        })
        render(<ProductionForm project={project} />)

        // Act
        await user.click(screen.getByRole('button', { name: 'Save Changes' }))

        // Assert
        expect(await screen.findByRole('alert')).toHaveTextContent('Invalid project data')
        expect(screen.getByText('Project name is required')).toBeInTheDocument()
        expect(vi.mocked(updateProjectAction).mock.calls[0][0]).toBe('proj-1')
    })

    it('should cancel back to the production when editing', () => {
        render(<ProductionForm project={project} />)
        expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/productions/proj-1')
    })
})
