import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ReportsPage } from '@/apps/dashboard/pages/ReportsPage'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')) },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))
;(globalThis as unknown as Record<string, unknown>).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('ReportsPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/reportes/i)).toBeInTheDocument())
  })

  it('renders tab buttons for Ventas e Inventario', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Ventas')).toBeInTheDocument()
      expect(screen.getByText('Inventario')).toBeInTheDocument()
      expect(screen.queryByText('Rentabilidad')).not.toBeInTheDocument()
    })
  })

  it('switches to Inventario tab and shows mock data', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Inventario'))
    fireEvent.click(screen.getByText('Inventario'))
    await waitFor(() => {
      expect(screen.getByText('Vainilla')).toBeInTheDocument()
    })
  })
})
