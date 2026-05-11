import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ProductsPage } from '@/apps/dashboard/pages/ProductsPage'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('ProductsPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/productos/i)).toBeInTheDocument())
  })

  it('renders add product button', async () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('button', { name: /nuevo producto/i })).toBeInTheDocument())
  })
})
