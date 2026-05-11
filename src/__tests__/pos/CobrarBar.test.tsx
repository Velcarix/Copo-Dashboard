import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CobrarBar } from '@/apps/pos/components/CobrarBar'

describe('CobrarBar', () => {
  it('shows total amount', () => {
    render(<CobrarBar total={9500} itemCount={2} onCobrar={vi.fn()} />)
    expect(screen.getByText('$95.00')).toBeInTheDocument()
  })

  it('is disabled when itemCount is 0', () => {
    render(<CobrarBar total={0} itemCount={0} onCobrar={vi.fn()} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is enabled when itemCount > 0', () => {
    render(<CobrarBar total={3500} itemCount={1} onCobrar={vi.fn()} />)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('calls onCobrar when clicked', async () => {
    const onCobrar = vi.fn()
    render(<CobrarBar total={3500} itemCount={1} onCobrar={onCobrar} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onCobrar).toHaveBeenCalled()
  })
})
