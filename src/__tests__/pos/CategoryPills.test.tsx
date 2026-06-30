import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

import { CategoryPills } from '@/apps/pos/components/CategoryPills'
import { ProductCategory } from '@shared-types'
import { api } from '@/shared/lib/api'
import { useAuthStore } from '@/shared/store/authStore'
import { useCategoryStore } from '@/shared/store/categoryStore'

const API_CATEGORIES = [
  { id: 'c1', key: ProductCategory.ICE_CREAM, name: 'Helados', emoji: '🍦', color: '#6366f1', sortOrder: 0, hidden: false },
  { id: 'c2', key: ProductCategory.COFFEE, name: 'Cafés', emoji: '☕', color: '#92400e', sortOrder: 1, hidden: false },
  { id: 'c3', key: ProductCategory.PASTRY, name: 'Pasteles', emoji: '🥐', color: '#d97706', sortOrder: 2, hidden: false },
  { id: 'c4', key: ProductCategory.COMBO, name: 'Combos', emoji: '🎁', color: '#7c3aed', sortOrder: 3, hidden: false },
  { id: 'c5', key: ProductCategory.EXTRA, name: 'Extras', emoji: '➕', color: '#6b7280', sortOrder: 4, hidden: false },
]

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ data: API_CATEGORIES })
  useAuthStore.setState({ branchId: 'branch-1' })
  useCategoryStore.setState({ categories: [], loaded: false, branchId: null })
})

describe('CategoryPills', () => {
  it('renders "Todos" pill first', async () => {
    render(<CategoryPills active="ALL" onChange={vi.fn()} />)
    await screen.findByRole('button', { name: /Helados/ })
    const pills = screen.getAllByRole('button')
    expect(pills[0]).toHaveTextContent('Todos')
  })

  it('renders all categories returned by the API', async () => {
    render(<CategoryPills active="ALL" onChange={vi.fn()} />)
    expect(await screen.findByRole('button', { name: /Helados/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cafés/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pasteles/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Combos/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Extras/ })).toBeInTheDocument()
  })

  it('marks active pill with aria-pressed=true', async () => {
    render(<CategoryPills active={ProductCategory.ICE_CREAM} onChange={vi.fn()} />)
    expect(await screen.findByRole('button', { name: /Helados/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with category key when clicked', async () => {
    const onChange = vi.fn()
    render(<CategoryPills active="ALL" onChange={onChange} />)
    await userEvent.click(await screen.findByRole('button', { name: /Helados/ }))
    expect(onChange).toHaveBeenCalledWith(ProductCategory.ICE_CREAM)
  })
})
