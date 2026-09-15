import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ReportsPage } from '@/apps/dashboard/pages/ReportsPage'
import { api } from '@/shared/lib/api'

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
  // Por defecto no hay backend y la página cae a los mocks de DEV.
  afterEach(() => { vi.mocked(api.get).mockRejectedValue(new Error('no backend')) })

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

  it('renders productos vendidos table with mock data on Ventas tab', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Productos vendidos')).toBeInTheDocument()
      expect(screen.getByText('Malteada de vainilla')).toBeInTheDocument()
      expect(screen.getByText('Vendidos')).toBeInTheDocument()
    })
  })

  it('junta en una fila el mismo producto de varias sucursales', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('/reports/products')) {
        return {
          data: [
            { name: 'Cono', category: 'Helados', price: 6500, quantitySold: 148 },
            { name: 'Vaso', category: 'Helados', price: 6500, quantitySold: 102 },
            { name: 'cono ', category: 'Helados', price: 7000, quantitySold: 16 },
            { name: 'vaso', category: 'Helados', price: 6500, quantitySold: 15 },
          ],
        }
      }
      if (url.includes('/orders')) return { data: [], total: 0 }
      return { data: [] }
    })

    render(<MemoryRouter><ReportsPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('164')).toBeInTheDocument())
    expect(screen.getAllByText(/^cono$/i)).toHaveLength(1)
    expect(screen.getAllByText(/^vaso$/i)).toHaveLength(1)
    expect(screen.getByText('117')).toBeInTheDocument()
    // Si las sucursales cobran distinto, el precio sale como rango
    expect(screen.getByText(/\$65\.00 – \$70\.00/)).toBeInTheDocument()
  })
})
