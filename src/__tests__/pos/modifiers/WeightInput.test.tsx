import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { WeightInput } from '@/apps/pos/components/modifiers/WeightInput'

describe('WeightInput', () => {
  it('renders preset buttons when presets provided', () => {
    render(<WeightInput value={100} presets={[100, 200, 500]} onChange={vi.fn()} />)
    // Use getAllByText because the active preset value also appears in the NumericInput span
    expect(screen.getAllByText('100 g').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('200 g').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('500 g').length).toBeGreaterThanOrEqual(1)
  })

  it('calls onChange with preset value when preset clicked', async () => {
    const onChange = vi.fn()
    render(<WeightInput value={100} presets={[100, 200, 500]} onChange={onChange} />)
    // "200 g" only appears once (preset button), so getByText is safe here
    await userEvent.click(screen.getByText('200 g'))
    expect(onChange).toHaveBeenCalledWith(200)
  })

  it('sets aria-pressed=true on active preset', () => {
    render(<WeightInput value={200} presets={[100, 200, 500]} onChange={vi.fn()} />)
    // Both the preset button and the NumericInput span render "200 g" / "100 g",
    // so use getAllByText and find the one that is a button.
    const active = screen.getAllByText('200 g').find(el => el.closest('button[aria-pressed]'))
    const inactive = screen.getAllByText('100 g').find(el => el.closest('button[aria-pressed]'))
    expect(active!.closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(inactive!.closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not render presets section when presets is empty', () => {
    render(<WeightInput value={100} presets={[]} onChange={vi.fn()} />)
    // Only the NumericInput stepper buttons should exist (+ and -)
    expect(screen.queryByRole('button', { name: /g/ })).not.toBeInTheDocument()
  })

  it('defaults unit to g', () => {
    render(<WeightInput value={150} onChange={vi.fn()} />)
    expect(screen.getByText(/150 g/)).toBeInTheDocument()
  })
})
