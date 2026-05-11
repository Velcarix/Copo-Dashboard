import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { InventoryAlert } from '@/apps/dashboard/components/InventoryAlert'

const items = [
  { name: 'Vainilla', currentStock: 800, minStock: 1000 },
  { name: 'Chocolate', currentStock: 200, minStock: 500 },
]

describe('InventoryAlert', () => {
  it('renders low stock items', () => {
    render(<MemoryRouter><InventoryAlert items={items} /></MemoryRouter>)
    expect(screen.getByText('Vainilla')).toBeInTheDocument()
    expect(screen.getByText('Chocolate')).toBeInTheDocument()
  })

  it('renders nothing when no low stock', () => {
    const { container } = render(<MemoryRouter><InventoryAlert items={[]} /></MemoryRouter>)
    expect(container).toBeEmptyDOMElement()
  })
})
