import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SalesChart } from '@/apps/dashboard/components/SalesChart'

// Recharts uses ResizeObserver internally
;(globalThis as unknown as Record<string, unknown>).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

const hourData = [
  { hour: 9, total: 15000, count: 4 },
  { hour: 14, total: 43000, count: 11 },
]

describe('SalesChart', () => {
  it('renders without crashing', () => {
    render(<SalesChart data={hourData} groupBy="hour" />)
    expect(document.querySelector('svg') ?? document.querySelector('[data-testid="sales-chart"]')).toBeTruthy()
  })

  it('renders title', () => {
    render(<SalesChart data={hourData} groupBy="hour" />)
    expect(screen.getByText(/ventas/i)).toBeInTheDocument()
  })
})
