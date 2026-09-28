import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LocationDetailsCard from '@/components/locations/LocationDetailsCard'

vi.mock('@/actions/locationActions', () => ({ removeKeywordAction: vi.fn() }))

const location = {
    id: 'loc-1',
    notes: null,
    keywords: [],
    address: '123 Main St',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5V 1A1',
    country: 'Canada',
    contactName: null,
    contactPhone: null,
    contactEmail: null,
}

describe('LocationDetailsCard', () => {
    it('should show a phone number even when there is no contact name', () => {
        render(<LocationDetailsCard location={{ ...location, contactPhone: '7057733685' }} />)
        expect(screen.getByText('7057733685')).toBeInTheDocument()
        expect(screen.queryByText('No contact info')).not.toBeInTheDocument()
    })

    it('should show an email even when there is no contact name', () => {
        render(<LocationDetailsCard location={{ ...location, contactEmail: 'pat@example.com' }} />)
        expect(screen.getByText('pat@example.com')).toBeInTheDocument()
    })

    it('should say when there are no contact details at all', () => {
        render(<LocationDetailsCard location={location} />)
        expect(screen.getByText('No contact info')).toBeInTheDocument()
    })

    it('should fall back to placeholder text for an empty description', () => {
        render(<LocationDetailsCard location={location} />)
        expect(screen.getByText('No description added.')).toBeInTheDocument()
        expect(screen.getByText('123 Main St, Toronto, ON')).toBeInTheDocument()
    })
})
