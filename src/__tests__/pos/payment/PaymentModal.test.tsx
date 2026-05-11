import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentModal } from '@/apps/pos/components/payment/PaymentModal'
import { useCartStore } from '@/shared/store/cartStore'
import { useNetworkStore } from '@/shared/store/networkStore'

vi.mock('@/shared/lib/api', () => ({
  api: { post: vi.fn(), get: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

beforeEach(() => {
  useCartStore.setState({
    items: [{ localId: 'i1', productId: 'p1', productName: 'Café', quantity: 1, unitPrice: 3500, modifiers: [] }],
    totalAmount: 3500, subtotal: 3500, discountAmount: 0, discount: null, orderId: 'o1',
  })
  useNetworkStore.setState({ isOnline: true, pendingSyncCount: 0 })
})

describe('PaymentModal', () => {
  it('renders payment method options', () => {
    render(<PaymentModal onSuccess={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Efectivo')).toBeInTheDocument()
    expect(screen.getByText('Tarjeta (Terminal)')).toBeInTheDocument()
    expect(screen.getByText('QR / Transferencia')).toBeInTheDocument()
  })

  it('shows CashFlow when CASH selected', async () => {
    render(<PaymentModal onSuccess={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Efectivo'))
    expect(screen.getByText('Total a cobrar')).toBeInTheDocument()
  })

  it('shows offline message when terminal selected offline', async () => {
    useNetworkStore.setState({ isOnline: false, pendingSyncCount: 0 })
    render(<PaymentModal onSuccess={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Tarjeta (Terminal)'))
    expect(screen.getByText(/terminal requiere conexión/i)).toBeInTheDocument()
  })

  it('calls onClose when X button clicked', async () => {
    const onClose = vi.fn()
    render(<PaymentModal onSuccess={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('cerrar modal de pago'))
    expect(onClose).toHaveBeenCalled()
  })
})
