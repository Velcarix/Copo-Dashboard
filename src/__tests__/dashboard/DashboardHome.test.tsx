import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { DashboardHome } from '@/apps/dashboard/pages/DashboardHome'
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
})
