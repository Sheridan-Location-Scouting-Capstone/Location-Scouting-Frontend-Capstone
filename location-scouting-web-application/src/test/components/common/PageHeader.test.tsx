import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageHeader from '@/components/common/PageHeader'

describe('PageHeader', () => {
    it('should render the title as the page heading', () => {
        render(<PageHeader title="Locations" />)
        expect(screen.getByRole('heading', { level: 1, name: 'Locations' })).toBeInTheDocument()
    })

    it('should link Back to the given page', () => {
        render(<PageHeader title="Scene 3" backHref="/productions/p1" />)
        expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/productions/p1')
    })

    it('should mark the last breadcrumb as the current page', () => {
        render(<PageHeader title="Scene 3" breadcrumbs={['My Film', 'Scenes', 'Scene 3']} />)
        const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
        expect(nav).toHaveTextContent('My Film/Scenes/Scene 3')
        expect(screen.getAllByText('Scene 3').find((el) => el.getAttribute('aria-current') === 'page')).toBeDefined()
    })

    it('should leave out the navigation row when there is nothing to show', () => {
        render(<PageHeader title="Locations" />)
        expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument()
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should render actions next to the title', () => {
        render(<PageHeader title="Locations" actions={<button>Add New Location</button>} />)
        expect(screen.getByRole('button', { name: 'Add New Location' })).toBeInTheDocument()
    })
})
