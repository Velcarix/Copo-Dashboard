import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardHome } from '@/apps/dashboard/pages/DashboardHome'
import { api } from '@/shared/lib/api'
import { useBranchStore } from '@/shared/store/branchStore'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')) },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

;(globalThis as unknown as Record<string, unknown>).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

const BASE_DATA = {
  totalSales: 10000, avgTicket: 1000, ordersCount: 10, customersCount: 8,
  breakEvenRemaining: 0, monthlyFixedCosts: 0,
  lowStockItems: [], salesChart: [], branchSalesChart: [],
  topProducts: [], salesByMethod: [], salesByCategory: [],
  salesByEmployee: [], salesByShift: [],
}

describe('DashboardHome', () => {
  it('renders heading', async () => {
    render(<MemoryRouter><DashboardHome /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/resumen/i)).toBeInTheDocument())
  })

  it('does not render pricing-mode panels for a 100% FIXED client (no regression)', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: BASE_DATA })
    render(<MemoryRouter><DashboardHome /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/resumen/i)).toBeInTheDocument())
    expect(screen.queryByText('Mix por variante')).not.toBeInTheDocument()
    expect(screen.queryByText('Top sabores (unidades)')).not.toBeInTheDocument()
    expect(screen.queryByText('Extras')).not.toBeInTheDocument()
  })

  it('renders byVariant, topFlavors and extras panels only when the backend sends them', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        ...BASE_DATA,
        byVariant: [{ variantName: 'Grande', revenue: 42000, units: 6 }],
        topFlavors: [{ name: 'Mango', units: 84 }],
        extras: { attachRate: 0.34, top: [{ name: 'Hot cheetos', revenue: 8400, units: 84 }] },
      },
    })
    render(<MemoryRouter><DashboardHome /></MemoryRouter>)
    expect(await screen.findByText('Mix por variante')).toBeInTheDocument()
    expect(screen.getByText('Top sabores (unidades)')).toBeInTheDocument()
    expect(screen.getByText('Extras')).toBeInTheDocument()
    expect(screen.getByText('Hot cheetos')).toBeInTheDocument()
  })

  // Regresión: las tarjetas "Info por sucursal" mostraban totalSales repartido
  // entre sucursales con un factor Math.random() — nunca cuadraban con el total
  // del período ni con la vista de cada sucursal, y cambiaban en cada render.
  describe('Info por sucursal (vista consolidada)', () => {
    const BRANCHES = [
      { id: 'b1', name: 'Francisco de Montejo', city: 'Mérida', isActive: true },
      { id: 'b2', name: 'Gran Plaza',           city: 'Mérida', isActive: true },
      { id: 'b3', name: 'Las americas',         city: 'Mérida', isActive: true },
    ]
    const GLOBAL_DATA = {
      ...BASE_DATA,
      totalSales: 919_100,
      ordersCount: 74,
      branchSalesChart: [
        { label: '10h', 'Francisco de Montejo': 100_000, 'Gran Plaza':  76_500, 'Las americas': 200_000 },
        { label: '11h', 'Francisco de Montejo': 147_100, 'Gran Plaza': 100_000, 'Las americas': 295_500 },
      ],
      branchTotals: [
        { branchId: 'b1', name: 'Francisco de Montejo', total: 247_100, orders: 12 },
        { branchId: 'b2', name: 'Gran Plaza',           total: 176_500, orders: 16 },
        { branchId: 'b3', name: 'Las americas',         total: 495_500, orders: 46 },
      ],
    }

    beforeEach(() => {
      useBranchStore.setState({ branches: BRANCHES, selectedId: 'ALL' })
    })

    it('muestra los totales reales por sucursal y su suma cuadra con las ventas del período', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: GLOBAL_DATA })
      render(<MemoryRouter><DashboardHome /></MemoryRouter>)

      expect(await screen.findByText('Info por sucursal')).toBeInTheDocument()
      expect(screen.getByText('$2,471.00')).toBeInTheDocument()
      expect(screen.getByText('$1,765.00')).toBeInTheDocument()
      expect(screen.getByText('$4,955.00')).toBeInTheDocument()
      expect(screen.getByText(/12 órdenes/)).toBeInTheDocument()
      expect(screen.getByText(/16 órdenes/)).toBeInTheDocument()
      expect(screen.getByText(/46 órdenes/)).toBeInTheDocument()

      const sum = GLOBAL_DATA.branchTotals.reduce((s, b) => s + b.total, 0)
      expect(sum).toBe(GLOBAL_DATA.totalSales)
    })

    it('cae a branchSalesChart (sin conteo de órdenes) si el backend no manda branchTotals', async () => {
      const { branchTotals: _omit, ...withoutTotals } = GLOBAL_DATA
      vi.mocked(api.get).mockResolvedValue({ data: withoutTotals })
      render(<MemoryRouter><DashboardHome /></MemoryRouter>)

      expect(await screen.findByText('Info por sucursal')).toBeInTheDocument()
      expect(screen.getByText('$2,471.00')).toBeInTheDocument()
      expect(screen.getByText('$1,765.00')).toBeInTheDocument()
      expect(screen.getByText('$4,955.00')).toBeInTheDocument()
      expect(screen.queryByText(/órdenes/)).not.toBeInTheDocument()
    })
  })
})
