import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { InventoryPage } from '@/apps/dashboard/pages/InventoryPage'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')), post: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('InventoryPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><InventoryPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/inventario/i)).toBeInTheDocument())
  })
})
