import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock api and db before importing CashFlow so the module-level
// VITE_API_URL guard in api.ts never executes during tests.
vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

vi.mock('@/shared/lib/db', () => ({
  db: {
    pendingOrders: {
      add: vi.fn(),
    },
  },
}))

import { CashFlow } from '@/apps/pos/components/payment/CashFlow'
import { useCartStore } from '@/shared/store/cartStore'

beforeEach(() => {
  useCartStore.setState({
    items: [{ localId: 'i1', productId: 'p1', productName: 'Café', quantity: 1, unitPrice: 3500, modifiers: [] }],
    orderId: 'order-1',
    discount: null,
    subtotal: 3500,
    discountAmount: 0,
    totalAmount: 3500,
  })
})

describe('CashFlow', () => {
  it('shows the total to pay', () => {
    render(<CashFlow onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Total a cobrar')).toBeInTheDocument()
    expect(screen.getByText('$35.00')).toBeInTheDocument()
  })

  it('calculates change when received >= total', async () => {
    render(<CashFlow onSuccess={vi.fn()} onCancel={vi.fn()} />)
    // Type "5000" (= $50.00) into the keypad — 5 digits
    await userEvent.click(screen.getByText('5'))
    await userEvent.click(screen.getByText('0'))
    await userEvent.click(screen.getByText('0'))
    await userEvent.click(screen.getByText('0'))
    await userEvent.click(screen.getByText('0'))
    expect(screen.getByText('Cambio')).toBeInTheDocument()
    expect(screen.getByText('$15.00')).toBeInTheDocument()
  })

  it('disables confirm when received amount is less than total', async () => {
    render(<CashFlow onSuccess={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByText('1'))
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()
  })
})
