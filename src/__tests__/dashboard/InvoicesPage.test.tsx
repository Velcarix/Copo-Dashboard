import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { InvoicesPage } from '@/apps/dashboard/pages/InvoicesPage'

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('no backend')),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('InvoicesPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><InvoicesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Facturas CFDI/i)).toBeInTheDocument())
  })

  it('shows mock invoices in DEV mode', async () => {
    render(<MemoryRouter><InvoicesPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('A-000001')).toBeInTheDocument()
    })
  })

  it('renders Nueva factura button', async () => {
    render(<MemoryRouter><InvoicesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('+ Nueva factura')).toBeInTheDocument())
  })

  it('opens issue form on button click', async () => {
    render(<MemoryRouter><InvoicesPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('+ Nueva factura'))
    fireEvent.click(screen.getByText('+ Nueva factura'))
    await waitFor(() => {
      expect(screen.getByText('Emitir factura')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('XAXX010101000')).toBeInTheDocument()
    })
  })

  it('shows cancel modal when cancelling active invoice', async () => {
    render(<MemoryRouter><InvoicesPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('A-000001'))
    // First active invoice should have a Cancelar button
    const cancelBtns = screen.getAllByText('Cancelar')
    fireEvent.click(cancelBtns[0])
    await waitFor(() => {
      // Modal heading — use role=heading to distinguish from button text
      expect(screen.getByRole('heading', { name: /Cancelar factura/i })).toBeInTheDocument()
    })
  })
})
