import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationTable, { filterLocations, LocationRow } from '@/components/locations/LocationTable'

vi.mock('@/actions/locationActions', () => ({
    updateLocationStatusAction: vi.fn(),
}))

const row = (overrides: Partial<LocationRow>): LocationRow => ({
    id: 'loc',
    name: 'Location',
    address: '1 Main St',
    city: 'Toronto',
    province: 'ON',
    keywords: [],
    notes: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    photos: [],
    ...overrides,
})

const locations = [
    row({ id: 'a', name: 'Brick Alley', keywords: ['brick', 'urban'] }),
    row({ id: 'b', name: 'Lake House', city: 'Muskoka', keywords: ['water'], status: 'ARCHIVED' }),
]

describe('filterLocations', () => {
    it('should match the search against name, address and city, ignoring case', () => {
        expect(filterLocations(locations, 'muskoka', []).map((l) => l.id)).toEqual(['b'])
        expect(filterLocations(locations, 'ALLEY', []).map((l) => l.id)).toEqual(['a'])
    })

    it('should keep locations with any of the selected keywords', () => {
        expect(filterLocations(locations, '', ['water', 'nothing']).map((l) => l.id)).toEqual(['b'])
    })
})

describe('LocationTable', () => {
    it('should link each row\'s edit button to the edit page', () => {
        render(<LocationTable locations={locations} />)
        expect(screen.getByRole('link', { name: 'Edit Brick Alley' })).toHaveAttribute('href', '/locations/a/edit')
    })

    it('should not offer to archive a location that is already archived', async () => {
        // Arrange
        const user = userEvent.setup()
        render(<LocationTable locations={locations} />)

        // Act
        await user.click(screen.getByRole('button', { name: 'More actions for Lake House' }))

        // Assert
        expect(screen.queryByRole('menuitem', { name: 'Archive' })).not.toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    })

    it('should explain an empty library', () => {
        render(<LocationTable locations={[]} />)
        expect(screen.getByText('No locations yet. Add your first location to get started!')).toBeInTheDocument()
    })
})
