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

  // El rango por defecto y el preset "Esta semana" deben ser la semana natural
  // lunes-domingo, no un rolling de 7 dias que mezcla dos semanas.
  describe('rangos naturales de semana y mes', () => {
    afterEach(() => { vi.useRealTimers() })

    function inputs() {
      return {
        from: screen.getByLabelText('Desde') as HTMLInputElement,
        to: screen.getByLabelText('Hasta') as HTMLInputElement,
      }
    }

    // Un miercoles cualquiera y un domingo — el domingo es el caso borde, porque
    // getDay() lo devuelve como 0 y cierra la semana en vez de abrirla.
    const CASES = [
      { label: 'miércoles', now: new Date(2026, 7, 12, 15, 0, 0), week: ['2026-08-10', '2026-08-16'] },
      { label: 'domingo',   now: new Date(2026, 7, 16, 15, 0, 0), week: ['2026-08-10', '2026-08-16'] },
    ]

    for (const c of CASES) {
      it(`abre en la semana lunes-domingo cuando hoy es ${c.label}`, async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.setSystemTime(c.now)
        render(<MemoryRouter><ReportsPage /></MemoryRouter>)
        await waitFor(() => screen.getByLabelText('Desde'))
        const { from, to } = inputs()
        expect([from.value, to.value]).toEqual(c.week)
      })
    }

    it('"Este mes" cubre el mes natural completo, no 30 días', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date(2026, 7, 12, 15, 0, 0)) // agosto, 31 días
      render(<MemoryRouter><ReportsPage /></MemoryRouter>)
      fireEvent.click(await screen.findByText('Este mes'))
      await waitFor(() => {
        const { from, to } = inputs()
        expect([from.value, to.value]).toEqual(['2026-08-01', '2026-08-31'])
      })
    })

    it('"Este mes" respeta un mes corto como febrero', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date(2026, 1, 10, 15, 0, 0)) // febrero 2026, 28 días
      render(<MemoryRouter><ReportsPage /></MemoryRouter>)
      fireEvent.click(await screen.findByText('Este mes'))
      await waitFor(() => {
        const { from, to } = inputs()
        expect([from.value, to.value]).toEqual(['2026-02-01', '2026-02-28'])
      })
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

  it('muestra cuánto entró por efectivo, tarjeta y delivery en el rango', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('/reports/mix')) {
        return { data: { paymentMethods: [
          { method: 'CARD_TERMINAL', total: 58500, count: 3 },
          { method: 'CASH',          total: 40000, count: 2 },
        ] } }
      }
      if (url.includes('/orders')) return { data: [], total: 0 }
      return { data: [] }
    })

    render(<MemoryRouter><ReportsPage /></MemoryRouter>)

    const cash = await screen.findByTestId('payment-cash')
    expect(cash).toHaveTextContent('$400.00')
    expect(screen.getByTestId('payment-card')).toHaveTextContent('$585.00')
    // Delivery se muestra aunque ese día no hubo pedidos por plataforma
    expect(screen.getByTestId('payment-delivery')).toHaveTextContent('$0.00')
  })
})
