import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { NumericInput } from '@/apps/pos/components/modifiers/NumericInput'

describe('NumericInput', () => {
  it('displays current value', () => {
    render(<NumericInput value={2} min={1} max={10} step={1} onChange={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('increments on + click', async () => {
    const onChange = vi.fn()
    render(<NumericInput value={2} min={1} max={10} step={1} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('más'))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('decrements on - click', async () => {
    const onChange = vi.fn()
    render(<NumericInput value={3} min={1} max={10} step={1} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('menos'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('does not go below min', async () => {
    const onChange = vi.fn()
    render(<NumericInput value={1} min={1} max={10} step={1} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('menos'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not go above max', async () => {
    const onChange = vi.fn()
    render(<NumericInput value={10} min={1} max={10} step={1} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('más'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
