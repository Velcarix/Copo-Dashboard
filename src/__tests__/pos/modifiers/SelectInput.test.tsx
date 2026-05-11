import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SelectInput } from '@/apps/pos/components/modifiers/SelectInput'
import type { ModifierOptionConfig } from '@shared-types'

const options: ModifierOptionConfig[] = [
  { id: 'o1', groupId: 'g1', name: 'Chico', priceDelta: 0, sortOrder: 0 },
  { id: 'o2', groupId: 'g1', name: 'Grande', priceDelta: 1000, sortOrder: 1 },
]

describe('SelectInput', () => {
  it('renders all options as chips', () => {
    render(<SelectInput options={options} selected={[]} multiple={false} onChange={vi.fn()} />)
    expect(screen.getByText('Chico')).toBeInTheDocument()
    expect(screen.getByText('Grande')).toBeInTheDocument()
  })

  it('selects an option (single mode) on click', async () => {
    const onChange = vi.fn()
    render(<SelectInput options={options} selected={[]} multiple={false} onChange={onChange} />)
    await userEvent.click(screen.getByText('Chico'))
    expect(onChange).toHaveBeenCalledWith(['o1'])
  })

  it('replaces selection in single mode', async () => {
    const onChange = vi.fn()
    render(<SelectInput options={options} selected={['o1']} multiple={false} onChange={onChange} />)
    await userEvent.click(screen.getByText('Grande'))
    expect(onChange).toHaveBeenCalledWith(['o2'])
  })

  it('allows multiple selection in multiple mode', async () => {
    const onChange = vi.fn()
    render(<SelectInput options={options} selected={['o1']} multiple={true} onChange={onChange} />)
    await userEvent.click(screen.getByText('Grande'))
    expect(onChange).toHaveBeenCalledWith(['o1', 'o2'])
  })

  it('deselects in multiple mode when clicking selected option', async () => {
    const onChange = vi.fn()
    render(<SelectInput options={options} selected={['o1', 'o2']} multiple={true} onChange={onChange} />)
    await userEvent.click(screen.getByText('Chico'))
    expect(onChange).toHaveBeenCalledWith(['o2'])
  })

  it('shows description when showDescription=true and opt.description exists', () => {
    const optionsWithDesc: ModifierOptionConfig[] = [
      { id: 'o1', groupId: 'g1', name: 'Pequeño', description: 'Para uno', priceDelta: 0, sortOrder: 0 },
    ]
    render(<SelectInput options={optionsWithDesc} selected={[]} multiple={false} showDescription onChange={vi.fn()} />)
    expect(screen.getByText('Para uno')).toBeInTheDocument()
  })

  it('shows aria-pressed=true on selected option', () => {
    render(<SelectInput options={options} selected={['o1']} multiple={false} onChange={vi.fn()} />)
    expect(screen.getByText('Chico').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Grande').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows priceDelta with + prefix for positive delta', () => {
    render(<SelectInput options={options} selected={[]} multiple={false} onChange={vi.fn()} />)
    expect(screen.getByText('+$10.00')).toBeInTheDocument()
  })
})
