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

  it('permite elegir un día exacto y moverse con las flechas', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Un día'))
    fireEvent.click(screen.getByText('Un día'))

    const input = await screen.findByLabelText('Día') as HTMLInputElement
    const today = input.value
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // No se puede avanzar más allá de hoy
    expect(screen.getByLabelText('Día siguiente')).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Día anterior'))
    await waitFor(() => expect(input.value).not.toBe(today))
    expect(screen.getByLabelText('Día siguiente')).not.toBeDisabled()
  })

  it('renders productos vendidos table with mock data on Ventas tab', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Productos vendidos')).toBeInTheDocument()
      expect(screen.getByText('Malteada de vainilla')).toBeInTheDocument()
      expect(screen.getByText('Vendidos')).toBeInTheDocument()
    })
  })

  it('muestra los paneles de mix — los mismos que Inicio — en la pestaña Ventas', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Top 10 productos por ingreso')).toBeInTheDocument()
      expect(screen.getByText('Ventas por categoría')).toBeInTheDocument()
      expect(screen.getByText('Top sabores (unidades)')).toBeInTheDocument()
    })
  })

  it('pide el mix al rango de fechas seleccionado', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('/reports/mix')) {
        return { data: { topProducts: [{ name: 'Cono especial', revenue: 12345, units: 3 }], salesByCategory: [] } }
      }
      if (url.includes('/orders')) return { data: [], total: 0 }
      return { data: [] }
    })

    render(<MemoryRouter><ReportsPage /></MemoryRouter>)

    await waitFor(() => {
      const mixCall = vi.mocked(api.get).mock.calls.map(c => String(c[0])).find(u => u.includes('/reports/mix'))
      expect(mixCall).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/)
    })
    // Sin variantes ni extras en la respuesta esos paneles no se dibujan
    expect(screen.getByText('Top 10 productos por ingreso')).toBeInTheDocument()
    expect(screen.queryByText('Mix por variante')).not.toBeInTheDocument()
    expect(screen.queryByText('Extras')).not.toBeInTheDocument()
  })
})
