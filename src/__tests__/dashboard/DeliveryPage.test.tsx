import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { DeliveryPage } from '@/apps/dashboard/pages/DeliveryPage'

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('no backend')),
    put: vi.fn().mockResolvedValue({}),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('DeliveryPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><DeliveryPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/delivery/i)).toBeInTheDocument())
  })

  it('shows mock orders in DEV mode after API failure', async () => {
    render(<MemoryRouter><DeliveryPage /></MemoryRouter>)
    // Waits for mock data — "Rappi" should appear from MOCK_ORDERS
    await waitFor(() => expect(screen.getByText('Rappi')).toBeInTheDocument())
  })

  it('renders platform filter dropdown', async () => {
    render(<MemoryRouter><DeliveryPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Todas las plataformas')).toBeInTheDocument()
    })
  })

  it('renders status filter dropdown', async () => {
    render(<MemoryRouter><DeliveryPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Todos los estados')).toBeInTheDocument()
    })
  })

  it('expands order details on row click', async () => {
    render(<MemoryRouter><DeliveryPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Rappi')).toBeInTheDocument())
    // Click the first order row to expand
    const rappiOrderRow = screen.getAllByRole('button').find(b => b.textContent?.includes('RAP-'))
    if (rappiOrderRow) {
      fireEvent.click(rappiOrderRow)
      await waitFor(() => {
        // Item detail should appear
        expect(screen.getByText(/Helado Vainilla/i)).toBeInTheDocument()
      })
    }
  })
})
