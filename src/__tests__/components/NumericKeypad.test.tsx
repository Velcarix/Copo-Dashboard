// frontend/src/__tests__/components/NumericKeypad.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { NumericKeypad } from '@/shared/components/NumericKeypad'

describe('NumericKeypad', () => {
  it('calls onChange with digit pressed', async () => {
    const onChange = vi.fn()
    render(<NumericKeypad value="" onChange={onChange} />)
    await userEvent.click(screen.getByText('5'))
    expect(onChange).toHaveBeenCalledWith('5')
  })

  it('calls onChange with delete (removes last char)', async () => {
    const onChange = vi.fn()
    render(<NumericKeypad value="123" onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('borrar'))
    expect(onChange).toHaveBeenCalledWith('12')
  })

  it('respects maxDigits', async () => {
    const onChange = vi.fn()
    render(<NumericKeypad value="1234" onChange={onChange} maxDigits={4} />)
    await userEvent.click(screen.getByText('5'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
