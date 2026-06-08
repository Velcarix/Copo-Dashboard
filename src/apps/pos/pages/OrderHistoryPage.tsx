import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { formatCurrency } from '@/shared/lib/currency'
import { useCartStore } from '@/shared/store/cartStore'
import { api } from '@/shared/lib/api'
import { useAuthStore } from '@/shared/store/authStore'

type OrderStatus = 'completed' | 'cancelled' | 'refunded'

interface HistoryItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number // centavos
}

interface HistoryOrder {
  id: string
  orderNumber: string
  items: HistoryItem[]
  total: number // centavos
  status: OrderStatus
  paymentMethod: string
  createdAt: string
  isEdited?: boolean
}

interface OrderHistoryPageProps {
  hideBackButton?: boolean
  readOnly?: boolean
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  completed: 'Completada',
  cancelled:  'Cancelada',
  refunded:   'Reembolsada',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  completed: 'text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400',
  cancelled:  'text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400',
  refunded:   'text-orange-700 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400',
}

type Modal =
  | { type: 'none' }
  | { type: 'refund'; order: HistoryOrder }
  | { type: 'cancel'; order: HistoryOrder }

interface ApiOrderItem { productId: string; name: string; quantity: number; unitPrice: number }
interface ApiOrder {
  id: string; orderNumber: number; createdAt: string; totalAmount: number
  status: string; paymentMethod: string | null; isEdited: boolean
  employeeName: string; items: ApiOrderItem[]
}

export function OrderHistoryPage({ hideBackButton = false, readOnly = false }: OrderHistoryPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const branchId = useAuthStore(s => s.branchId)
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [modal, setModal] = useState<Modal>({ type: 'none' })
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!branchId) return
    setLoading(true)
    api.get<{ data: ApiOrder[]; total: number }>(`/api/v1/orders?branchId=${branchId}&limit=50`)
      .then(({ data }) => {
        setOrders(data.map(o => ({
          id: o.id,
          orderNumber: `#${String(o.orderNumber).padStart(4, '0')}`,
          items: o.items.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          total: o.totalAmount,
          status: o.status.toLowerCase() as OrderStatus,
          paymentMethod: o.paymentMethod ?? '',
          createdAt: o.createdAt,
          isEdited: o.isEdited,
        })))
      })
      .catch(() => { /* show empty list */ })
      .finally(() => setLoading(false))
  }, [branchId])

  // Apply edit result when returning from POS
  useEffect(() => {
    const state = location.state as { savedEdit?: { orderId: string; newTotal: number } } | null
    if (state?.savedEdit) {
      const { orderId, newTotal } = state.savedEdit
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, total: newTotal, isEdited: true } : o
      ))
      // Clear location state so refresh doesn't re-apply
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  const filtered = orders.filter(o => filterStatus === 'all' || o.status === filterStatus)

  // ── Edit → redirect to POS ────────────────────────────────────────────────

  function openEdit(order: HistoryOrder) {
    const store = useCartStore.getState()
    store.clearCart()
    order.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        useCartStore.getState().addItem(
          { id: item.productId, name: item.name, basePrice: item.unitPrice },
          []
        )
      }
    })
    store.setEditingOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      originalTotal: order.total,
    })
    navigate('/pos')
  }

  // ── Refund / cancel ───────────────────────────────────────────────────────

  async function confirmRefund() {
    if (modal.type !== 'refund') return
    setLoading(true)
    try {
      await api.post(`/api/v1/orders/${modal.order.id}/refund`, {})
      setOrders(prev => prev.map(o =>
        o.id === modal.order.id ? { ...o, status: 'refunded' } : o
      ))
    } finally {
      setLoading(false)
      setModal({ type: 'none' })
    }
  }

  async function confirmCancel() {
    if (modal.type !== 'cancel') return
    setLoading(true)
    try {
      await api.post(`/api/v1/orders/${modal.order.id}/cancel`, {})
      setOrders(prev => prev.map(o =>
        o.id === modal.order.id ? { ...o, status: 'cancelled' } : o
      ))
    } finally {
      setLoading(false)
      setModal({ type: 'none' })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        {!hideBackButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        <h1 className="font-bold text-[var(--color-text-primary)]">Historial del día</h1>
        <div className="flex-1" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as OrderStatus | 'all')}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="all">Todas</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="refunded">Reembolsadas</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-3 md:p-4">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide hidden sm:table-cell">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-[var(--color-text-muted)]">
                    Sin órdenes con este filtro
                  </td>
                </tr>
              ) : filtered.map(order => (
                <>
                  <tr
                    key={order.id}
                    className={`hover:bg-[var(--color-border)]/30 transition-colors ${readOnly ? 'cursor-pointer' : ''}`}
                    onClick={readOnly ? () => setExpandedId(expandedId === order.id ? null : order.id) : undefined}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[var(--color-text-primary)] font-semibold">{order.orderNumber}</span>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-[200px] truncate hidden sm:table-cell">
                      {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                          {STATUS_LABEL[order.status]}
                        </span>
                        {order.isEdited && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400">
                            Editada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <div className="flex justify-end">
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {expandedId === order.id ? '▲' : '▼'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === 'completed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(order)}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'refund', order })}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                              >
                                Reembolsar
                              </button>
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'cancel', order })}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  {readOnly && expandedId === order.id && (
                    <tr key={`${order.id}-detail`} className="bg-[var(--color-bg)]">
                      <td colSpan={5} className="px-6 py-3">
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                            Detalle de la orden · {order.paymentMethod}
                          </p>
                          {order.items.map(item => (
                            <div key={item.productId} className="flex justify-between text-sm">
                              <span className="text-[var(--color-text-primary)]">{item.name} <span className="text-[var(--color-text-muted)]">×{item.quantity}</span></span>
                              <span className="font-mono text-[var(--color-text-secondary)]">{formatCurrency(item.unitPrice * item.quantity)}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-[var(--color-border)] flex justify-between text-sm font-bold">
                            <span className="text-[var(--color-text-primary)]">Total</span>
                            <span className="font-mono">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── REFUND MODAL ───────────────────────────────────────────────────── */}
      {modal.type === 'refund' && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.12" />
                </svg>
              </div>
              <h2 className="font-bold text-[var(--color-text-primary)] text-lg">¿Reembolsar orden?</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
                Se reembolsará <strong>{formatCurrency(modal.order.total)}</strong> de la orden{' '}
                <span className="font-mono">{modal.order.orderNumber}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModal({ type: 'none' })}
                className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 transition-colors"
              >
                No, volver
              </button>
              <button
                type="button"
                onClick={confirmRefund}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading ? 'Procesando…' : 'Sí, reembolsar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ───────────────────────────────────────────────────── */}
      {modal.type === 'cancel' && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h2 className="font-bold text-[var(--color-text-primary)] text-lg">¿Cancelar orden?</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
                La orden <span className="font-mono">{modal.order.orderNumber}</span> quedará marcada como cancelada.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModal({ type: 'none' })}
                className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40 transition-colors"
              >
                No, volver
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading ? 'Procesando…' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
