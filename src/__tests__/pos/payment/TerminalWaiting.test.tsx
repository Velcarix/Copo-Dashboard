import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TerminalWaiting } from '@/apps/pos/components/payment/TerminalWaiting'
import { PaymentStatus } from '@shared-types'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn() },
}))

import { api } from '@/shared/lib/api'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('TerminalWaiting', () => {
  it('shows countdown starting at 90', () => {
    vi.mocked(api.get).mockResolvedValue({ status: PaymentStatus.PENDING, transactionId: null })
    render(<TerminalWaiting intentId="intent-1" amount={3500} onSuccess={vi.fn()} onError={vi.fn()} onTimeout={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/90/)).toBeInTheDocument()
  })

  it('calls onSuccess when status is COMPLETED', async () => {
    const onSuccess = vi.fn()
    vi.mocked(api.get).mockResolvedValue({ status: PaymentStatus.COMPLETED, transactionId: 'tx-1' })
    render(<TerminalWaiting intentId="intent-1" amount={3500} onSuccess={onSuccess} onError={vi.fn()} onTimeout={vi.fn()} onCancel={vi.fn()} />)
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('calls onError when status is DECLINED', async () => {
    const onError = vi.fn()
    vi.mocked(api.get).mockResolvedValue({ status: PaymentStatus.DECLINED, transactionId: null })
    render(<TerminalWaiting intentId="intent-1" amount={3500} onSuccess={vi.fn()} onError={onError} onTimeout={vi.fn()} onCancel={vi.fn()} />)
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(onError).toHaveBeenCalledWith(PaymentStatus.DECLINED)
  })

  it('calls onTimeout when countdown reaches zero', async () => {
    const onTimeout = vi.fn()
    vi.mocked(api.get).mockResolvedValue({ status: PaymentStatus.PENDING, transactionId: null })
    render(<TerminalWaiting intentId="intent-1" amount={3500} onSuccess={vi.fn()} onError={vi.fn()} onTimeout={onTimeout} onCancel={vi.fn()} />)
    await act(async () => { vi.advanceTimersByTime(90_000) })
    expect(onTimeout).toHaveBeenCalled()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    vi.mocked(api.get).mockResolvedValue({ status: PaymentStatus.PENDING, transactionId: null })
    render(<TerminalWaiting intentId="intent-1" amount={3500} onSuccess={vi.fn()} onError={vi.fn()} onTimeout={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText(/cancelar/i))
    expect(onCancel).toHaveBeenCalled()
  })
})
