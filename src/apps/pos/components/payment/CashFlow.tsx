import { useState } from 'react'
import { useCartStore } from '@/shared/store/cartStore'
import { useAuthStore } from '@/shared/store/authStore'
import { useNetworkStore } from '@/shared/store/networkStore'
import { api, ApiError } from '@/shared/lib/api'
import { db } from '@/shared/lib/db'
import { NumericKeypad } from '@/shared/components/NumericKeypad'
import { formatCurrency } from '@/shared/lib/currency'
import { PaymentMethod, OrderSource } from '@shared-types'
import type { CreateOrderDto, OrderResponse, ApiResponse } from '@shared-types'
import { v4 as uuidv4 } from 'uuid'

interface CashFlowProps {
  onSuccess: (orderResponse?: OrderResponse) => void
  onCancel: () => void
}

/**
 * CashFlow handles cash payment entry.
 * The `received` state stores the entered amount as a centavos integer string.
 * NumericKeypad is limited to 4 digits (max 9999 centavos = $99.99) to match
 * the most common denomination inputs in the POS context.
 * Larger bills can be handled by the extended keypad in future iterations.
 */
export function CashFlow({ onSuccess, onCancel }: CashFlowProps) {
  const { items, totalAmount, discountAmount, discount, orderId, clearCart } = useCartStore()
  const { user, shiftId, branchId } = useAuthStore()
  const { isOnline } = useNetworkStore()
  const [received, setReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // received is a pesos string with decimal (e.g. "50.00" = $50.00 = 5000 centavos)
  const receivedCents = received ? Math.round(parseFloat(received) * 100) : 0
  const change = receivedCents - totalAmount
  const canConfirm = receivedCents >= totalAmount && items.length > 0

  async function handleConfirm() {
    if (!canConfirm || !user) return
    setLoading(true)
    setError('')

    const order: CreateOrderDto = {
      id: orderId,
      branchId: branchId ?? '',
      employeeId: user.id,
      shiftId: shiftId ?? uuidv4(),
      paymentMethod: PaymentMethod.CASH,
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        modifiers: i.modifiers.map(m => ({ optionId: m.optionId, priceDelta: m.priceDelta })),
        note: i.note,
      })),
      totalAmount,
      discountAmount: discountAmount || undefined,
      discountReason: discount?.reason,
      cashReceived: receivedCents,
      source: OrderSource.POS,
      createdAt: new Date().toISOString(),
    }

    try {
      if (isOnline) {
        const res = await api.post<ApiResponse<OrderResponse>>('/api/v1/orders', order)
        clearCart()
        onSuccess(res.data)
      } else {
        await db.pendingOrders.add({
          localId: orderId,
          branchId: branchId ?? '',
          data: order,
          createdAt: order.createdAt!,
          synced: false,
        })
        clearCart()
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Total a cobrar</p>
        <p className="text-3xl font-bold text-[var(--color-text-primary)]">{formatCurrency(totalAmount)}</p>
      </div>

      <div className="text-center">
        <p className="text-xs text-[var(--color-text-muted)]">Recibido</p>
        <p className="text-2xl font-bold text-[var(--color-accent)]">
          {receivedCents > 0 ? formatCurrency(receivedCents) : '$0.00'}
        </p>
      </div>

      {change >= 0 && received && (
        <div className="flex justify-between bg-[var(--color-accent-subtle)] rounded-xl px-4 py-2">
          <span className="font-semibold text-sm text-[var(--color-text-primary)]">Cambio</span>
          <span className="font-bold text-[var(--color-success)]">{formatCurrency(change)}</span>
        </div>
      )}

      <NumericKeypad value={received} onChange={setReceived} showDecimal />

      {error && <p className="text-sm text-[var(--color-danger)] text-center">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm || loading}
          aria-label="confirmar pago en efectivo"
          className="flex-1 py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-40"
        >
          {loading ? '…' : 'Confirmar cobro'}
        </button>
      </div>
    </div>
  )
}
