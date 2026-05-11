import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MetricCard } from '@/apps/dashboard/components/MetricCard'

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Ventas hoy" value="$4,350.00" />)
    expect(screen.getByText('Ventas hoy')).toBeInTheDocument()
    expect(screen.getByText('$4,350.00')).toBeInTheDocument()
  })

  it('renders positive trend', () => {
    render(<MetricCard label="Ventas hoy" value="$4,350.00" trend={{ value: 12, positive: true }} />)
    expect(screen.getByText(/12/)).toBeInTheDocument()
    expect(screen.getByText(/↑/)).toBeInTheDocument()
  })

  it('renders negative trend', () => {
    render(<MetricCard label="Ventas hoy" value="$4,350.00" trend={{ value: 5, positive: false }} />)
    expect(screen.getByText(/↓/)).toBeInTheDocument()
  })
})
