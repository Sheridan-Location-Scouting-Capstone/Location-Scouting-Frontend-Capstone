import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductionGrid, { sortProductions } from '@/components/productions/ProductionGrid'

const production = (id: string, name: string, createdAt: string) => ({
    id,
    name,
    city: 'Toronto',
    province: 'ON',
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
})

const projects = [
    production('b', 'Middle Film', '2026-02-01'),
    production('a', 'Old Film', '2026-01-01'),
    production('c', 'New Film', '2026-03-01'),
]

const cardNames = () => screen.getAllByTestId('production-card').map((card) => within(card).getByRole('heading').textContent)

describe('sortProductions', () => {
    it('should sort newest first or oldest first without mutating the input', () => {
        expect(sortProductions(projects, 'newest').map((p) => p.id)).toEqual(['c', 'b', 'a'])
        expect(sortProductions(projects, 'oldest').map((p) => p.id)).toEqual(['a', 'b', 'c'])
        expect(projects.map((p) => p.id)).toEqual(['b', 'a', 'c'])
    })
})

describe('ProductionGrid', () => {
    it('should list the newest production first by default', () => {
        render(<ProductionGrid projects={projects} />)
        expect(cardNames()).toEqual(['New Film', 'Middle Film', 'Old Film'])
    })

    it('should re-sort when the sort order is changed', async () => {
        // Arrange
        const user = userEvent.setup()
        render(<ProductionGrid projects={projects} />)

        // Act
        await user.click(screen.getByRole('combobox', { name: 'Sort by Date' }))
        await user.click(screen.getByRole('option', { name: 'Oldest - Newest' }))

        // Assert
        expect(cardNames()).toEqual(['Old Film', 'Middle Film', 'New Film'])
    })

    it('should link each card to its production', () => {
        render(<ProductionGrid projects={projects} />)
        expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/productions/c')
    })

    it('should explain when there are no productions', () => {
        render(<ProductionGrid projects={[]} />)
        expect(screen.getByText('No productions yet. Create your first production to get started!')).toBeInTheDocument()
    })
})
