import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategoryPills } from '@/apps/pos/components/CategoryPills'
import { ProductCategory } from '@shared-types'

describe('CategoryPills', () => {
  it('renders "Todos" pill first', () => {
    render(<CategoryPills active="ALL" onChange={vi.fn()} />)
    const pills = screen.getAllByRole('button')
    expect(pills[0]).toHaveTextContent('Todos')
  })

  it('renders all ProductCategory values', () => {
    render(<CategoryPills active="ALL" onChange={vi.fn()} />)
    expect(screen.getByText('Helados')).toBeInTheDocument()
    expect(screen.getByText('Cafés')).toBeInTheDocument()
    expect(screen.getByText('Pasteles')).toBeInTheDocument()
    expect(screen.getByText('Combos')).toBeInTheDocument()
    expect(screen.getByText('Extras')).toBeInTheDocument()
  })

  it('marks active pill with aria-pressed=true', () => {
    render(<CategoryPills active={ProductCategory.ICE_CREAM} onChange={vi.fn()} />)
    expect(screen.getByText('Helados').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Todos').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with category key when clicked', async () => {
    const onChange = vi.fn()
    render(<CategoryPills active="ALL" onChange={onChange} />)
    await userEvent.click(screen.getByText('Helados'))
    expect(onChange).toHaveBeenCalledWith(ProductCategory.ICE_CREAM)
  })
})
