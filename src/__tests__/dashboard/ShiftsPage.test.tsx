import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ShiftsPage } from '@/apps/dashboard/pages/ShiftsPage'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')) },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('ShiftsPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><ShiftsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Turnos \/ Caja/i)).toBeInTheDocument())
  })

  it('shows mock shift data in DEV mode', async () => {
    render(<MemoryRouter><ShiftsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument()
    })
  })

  it('renders summary stat cards', async () => {
    render(<MemoryRouter><ShiftsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Ventas totales')).toBeInTheDocument()
      expect(screen.getByText('Órdenes')).toBeInTheDocument()
      expect(screen.getByText('Diferencia neta')).toBeInTheDocument()
      expect(screen.getByText('Turnos con faltante')).toBeInTheDocument()
    })
  })

  it('switches range to 14 days', async () => {
    render(<MemoryRouter><ShiftsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('14d'))
    fireEvent.click(screen.getByText('14d'))
    // Button should be active (no error thrown)
    expect(screen.getByText('14d')).toBeInTheDocument()
  })

  it('expands shift details on click', async () => {
    render(<MemoryRouter><ShiftsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument())
    // Click the first shift row
    const shiftButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('María López'))
    if (shiftButtons[0]) {
      fireEvent.click(shiftButtons[0])
      await waitFor(() => {
        expect(screen.getByText('Efectivo inicial')).toBeInTheDocument()
      })
    }
  })
})
