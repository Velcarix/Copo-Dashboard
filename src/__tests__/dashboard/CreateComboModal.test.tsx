import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateComboModal } from '@/apps/dashboard/pages/CreateComboModal'
import { useCategoryStore } from '@/shared/store/categoryStore'
import { PricingMode } from '@shared-types'

vi.mock('@/shared/lib/api', () => ({
  api: { post: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

const PRODUCTS = [
  { id: 'p1', name: 'Café Americano', category: 'cafe', basePrice: 3500, active: true },
  { id: 'p2', name: 'Latte', category: 'cafe', basePrice: 0, active: true },
  { id: 'p3', name: 'Croissant', category: 'panaderia', basePrice: 3000, active: true },
]

beforeEach(() => {
  useCategoryStore.setState({
    categories: [
      { id: 'c1', key: 'cafe', label: 'Café', emoji: '☕', color: '#6366f1', sortOrder: 0, hidden: false, pricingMode: PricingMode.VARIANTS },
      { id: 'c2', key: 'panaderia', label: 'Panadería', emoji: '🥐', color: '#f59e0b', sortOrder: 1, hidden: false, pricingMode: PricingMode.FIXED },
    ],
    loaded: true,
    branchId: 'b1',
    error: null,
  })
})

describe('CreateComboModal', () => {
  it('excludes products from VARIANTS categories from the combo picker', () => {
    render(<CreateComboModal products={PRODUCTS} branchId="b1" onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.queryByText('Café Americano')).not.toBeInTheDocument()
    expect(screen.queryByText('Latte')).not.toBeInTheDocument()
    expect(screen.getByText('Croissant')).toBeInTheDocument()
  })
})
