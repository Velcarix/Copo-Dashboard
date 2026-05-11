import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { DeliveryPlatform, DeliveryOrderStatus } from '@shared-types'

interface DeliveryOrder {
  id: string
  platform: DeliveryPlatform
  externalOrderId: string
  status: DeliveryOrderStatus
  items: Array<{ name: string; quantity: number; modifiers: string[] }>
  totalAmount: number
  customerName: string | null
  createdAt: string
  estimatedReadyAt: string | null
}

const PLATFORM_LABEL: Record<DeliveryPlatform, string> = {
  [DeliveryPlatform.RAPPI]:     'Rappi',
  [DeliveryPlatform.UBER_EATS]: 'Uber Eats',
  [DeliveryPlatform.DIDI_FOOD]: 'DiDi Food',
  [DeliveryPlatform.JUSTO]:     'Justo',
}

const PLATFORM_COLOR: Record<DeliveryPlatform, string> = {
  [DeliveryPlatform.RAPPI]:     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  [DeliveryPlatform.UBER_EATS]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [DeliveryPlatform.DIDI_FOOD]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  [DeliveryPlatform.JUSTO]:     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
}

const STATUS_LABEL: Record<DeliveryOrderStatus, string> = {
  [DeliveryOrderStatus.NEW]:       'Nuevo',
  [DeliveryOrderStatus.ACCEPTED]:  'Aceptado',
  [DeliveryOrderStatus.PREPARING]: 'Preparando',
  [DeliveryOrderStatus.READY]:     'Listo para recoger',
  [DeliveryOrderStatus.DELIVERED]: 'Entregado',
  [DeliveryOrderStatus.CANCELLED]: 'Cancelado',
  [DeliveryOrderStatus.REJECTED]:  'Rechazado',
}

const STATUS_COLOR: Record<DeliveryOrderStatus, string> = {
  [DeliveryOrderStatus.NEW]:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  [DeliveryOrderStatus.ACCEPTED]:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [DeliveryOrderStatus.PREPARING]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  [DeliveryOrderStatus.READY]:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [DeliveryOrderStatus.DELIVERED]: 'bg-gray-100 text-gray-500 dark:bg-gray-700/30 dark:text-gray-400',
  [DeliveryOrderStatus.CANCELLED]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  [DeliveryOrderStatus.REJECTED]:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

// Flujo lineal: Nuevo → Preparando → Listo → Entregado
const ACTIONS: Partial<Record<DeliveryOrderStatus, { status: DeliveryOrderStatus; label: string }>> = {
  [DeliveryOrderStatus.NEW]:       { status: DeliveryOrderStatus.PREPARING, label: 'Empezar a preparar' },
  [DeliveryOrderStatus.ACCEPTED]:  { status: DeliveryOrderStatus.PREPARING, label: 'Empezar a preparar' },
  [DeliveryOrderStatus.PREPARING]: { status: DeliveryOrderStatus.READY,     label: 'Listo para recoger' },
  [DeliveryOrderStatus.READY]:     { status: DeliveryOrderStatus.DELIVERED, label: 'Entregado ✓' },
}

// Only show active orders in the POS (not delivered/cancelled/rejected)
const ACTIVE_STATUSES: DeliveryOrderStatus[] = [
  DeliveryOrderStatus.NEW,
  DeliveryOrderStatus.ACCEPTED,
  DeliveryOrderStatus.PREPARING,
  DeliveryOrderStatus.READY,
]

const MOCK_ORDERS: DeliveryOrder[] = [
  {
    id: 'd1', platform: DeliveryPlatform.RAPPI, externalOrderId: 'RAP-9182',
    status: DeliveryOrderStatus.NEW,
    items: [
      { name: 'Helado Vainilla', quantity: 2, modifiers: ['Cono'] },
      { name: 'Agua mineral', quantity: 1, modifiers: [] },
    ],
    totalAmount: 10500, customerName: 'Luis M.',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(), estimatedReadyAt: null,
  },
  {
    id: 'd2', platform: DeliveryPlatform.UBER_EATS, externalOrderId: 'UBE-5571',
    status: DeliveryOrderStatus.PREPARING,
    items: [{ name: 'Frappe Chocolate', quantity: 1, modifiers: ['Sin azúcar'] }],
    totalAmount: 6500, customerName: 'Sofía R.',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    estimatedReadyAt: new Date(Date.now() + 5 * 60000).toISOString(),
  },
  {
    id: 'd3', platform: DeliveryPlatform.DIDI_FOOD, externalOrderId: 'DIDI-3321',
    status: DeliveryOrderStatus.READY,
    items: [{ name: 'Pastel 3 leches', quantity: 1, modifiers: [] }],
    totalAmount: 8500, customerName: 'Carlos V.',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(), estimatedReadyAt: null,
  },
]

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'ahora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

export function activeDeliveryCount(orders: DeliveryOrder[]) {
  return orders.filter(o => ACTIVE_STATUSES.includes(o.status) && o.status !== DeliveryOrderStatus.READY).length
}

export function DeliveryPanel() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  function load() {
    api.get<{ data: DeliveryOrder[] }>('/api/v1/delivery/orders?branchId=default&status=active')
      .then(res => setOrders(res.data.filter(o => ACTIVE_STATUSES.includes(o.status))))
      .catch(() => { if (import.meta.env.DEV) setOrders(MOCK_ORDERS) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Poll every 30 seconds
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function handleAction(orderId: string, newStatus: DeliveryOrderStatus) {
    setUpdating(orderId)
    try {
      await api.put(`/api/v1/delivery/orders/${orderId}/status`, { status: newStatus, note: null })
      setOrders(prev => {
        const updated = prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        // Remove from list if delivered/cancelled
        return updated.filter(o => ACTIVE_STATUSES.includes(o.status))
      })
    } catch {
      if (import.meta.env.DEV) {
        setOrders(prev => {
          const updated = prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
          return updated.filter(o => ACTIVE_STATUSES.includes(o.status))
        })
      }
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)] text-sm">
        Cargando pedidos…
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-[var(--color-text-muted)]">
        <span className="text-3xl">🛵</span>
        <p className="text-sm">Sin pedidos de delivery activos</p>
        <button type="button" onClick={load} className="text-xs text-[var(--color-accent)] hover:underline">Actualizar</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] shrink-0">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          Pedidos activos <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white text-xs">{orders.length}</span>
        </span>
        <button type="button" onClick={load} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
          Actualizar
        </button>
      </div>

      {/* Order cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orders.map(order => {
          const action = ACTIONS[order.status]
          const isUpdating = updating === order.id

          return (
            <div
              key={order.id}
              className={[
                'rounded-2xl border bg-[var(--color-surface)] overflow-hidden',
                order.status === DeliveryOrderStatus.NEW
                  ? 'border-yellow-400 dark:border-yellow-600 shadow-md'
                  : order.status === DeliveryOrderStatus.READY
                    ? 'border-green-400 dark:border-green-600 shadow-md'
                    : 'border-[var(--color-border)]',
              ].join(' ')}
            >
              {/* Card header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLATFORM_COLOR[order.platform]}`}>
                  {PLATFORM_LABEL[order.platform]}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">{order.externalOrderId}</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              {/* Items */}
              <div className="px-3 py-2.5 space-y-1">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sm font-bold text-[var(--color-text-primary)] w-5 shrink-0">{item.quantity}×</span>
                    <div className="min-w-0">
                      <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                      {item.modifiers.length > 0 && (
                        <span className="text-xs text-[var(--color-text-muted)] ml-1">· {item.modifiers.join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer: time + total + actions */}
              <div className="flex items-center gap-2 px-3 pb-3">
                <span className="text-xs text-[var(--color-text-muted)]">🕐 {elapsed(order.createdAt)}</span>
                {order.customerName && (
                  <span className="text-xs text-[var(--color-text-muted)]">· {order.customerName}</span>
                )}
                <span className="ml-auto text-sm font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>

              {/* Action button */}
              {action && (
                <div className="px-3 pb-3">
                  <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAction(order.id, action.status)}
                      className={[
                        'w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40',
                        action.status === DeliveryOrderStatus.DELIVERED
                          ? 'bg-green-600 text-white hover:opacity-90'
                          : 'bg-[var(--color-accent)] text-white hover:opacity-90',
                      ].join(' ')}
                    >
                      {isUpdating ? '…' : action.label}
                    </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
