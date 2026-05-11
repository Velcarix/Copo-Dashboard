import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { DeliveryPlatform, DeliveryOrderStatus } from '@shared-types'

interface DeliveryOrder {
  id: string
  platform: DeliveryPlatform
  externalOrderId: string
  status: DeliveryOrderStatus
  autoAccepted: boolean
  items: Array<{ name: string; quantity: number; price: number; modifiers: string[] }>
  totalAmount: number
  customerName: string | null
  customerPhone: string | null
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
  [DeliveryOrderStatus.NEW]:        'Nuevo',
  [DeliveryOrderStatus.ACCEPTED]:   'Aceptado',
  [DeliveryOrderStatus.PREPARING]:  'Preparando',
  [DeliveryOrderStatus.READY]:      'Listo',
  [DeliveryOrderStatus.DELIVERED]:  'Entregado',
  [DeliveryOrderStatus.CANCELLED]:  'Cancelado',
  [DeliveryOrderStatus.REJECTED]:   'Rechazado',
}

const STATUS_COLOR: Record<DeliveryOrderStatus, string> = {
  [DeliveryOrderStatus.NEW]:        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  [DeliveryOrderStatus.ACCEPTED]:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [DeliveryOrderStatus.PREPARING]:  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  [DeliveryOrderStatus.READY]:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [DeliveryOrderStatus.DELIVERED]:  'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400',
  [DeliveryOrderStatus.CANCELLED]:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  [DeliveryOrderStatus.REJECTED]:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

// Next actions allowed per status
const NEXT_STATUSES: Partial<Record<DeliveryOrderStatus, Array<{ value: string; label: string }>>> = {
  [DeliveryOrderStatus.NEW]:       [{ value: 'preparing', label: 'Preparar' }, { value: 'cancelled', label: 'Cancelar' }],
  [DeliveryOrderStatus.ACCEPTED]:  [{ value: 'preparing', label: 'Preparar' }, { value: 'cancelled', label: 'Cancelar' }],
  [DeliveryOrderStatus.PREPARING]: [{ value: 'ready', label: 'Marcar listo' }, { value: 'cancelled', label: 'Cancelar' }],
}

const MOCK_ORDERS: DeliveryOrder[] = [
  {
    id: 'd1', platform: DeliveryPlatform.RAPPI, externalOrderId: 'RAP-9182',
    status: DeliveryOrderStatus.NEW, autoAccepted: true,
    items: [
      { name: 'Helado Vainilla', quantity: 2, price: 4500, modifiers: ['Cono'] },
      { name: 'Agua mineral', quantity: 1, price: 1500, modifiers: [] },
    ],
    totalAmount: 10500, customerName: 'Luis M.', customerPhone: null,
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(), estimatedReadyAt: null,
  },
  {
    id: 'd2', platform: DeliveryPlatform.UBER_EATS, externalOrderId: 'UBE-5571',
    status: DeliveryOrderStatus.PREPARING, autoAccepted: false,
    items: [
      { name: 'Frappe Chocolate', quantity: 1, price: 6500, modifiers: ['Sin azúcar'] },
    ],
    totalAmount: 6500, customerName: 'Sofía R.', customerPhone: '9991234567',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(), estimatedReadyAt: new Date(Date.now() + 5 * 60000).toISOString(),
  },
  {
    id: 'd3', platform: DeliveryPlatform.DIDI_FOOD, externalOrderId: 'DIDI-3321',
    status: DeliveryOrderStatus.READY, autoAccepted: true,
    items: [
      { name: 'Pastel de 3 leches', quantity: 1, price: 8500, modifiers: [] },
    ],
    totalAmount: 8500, customerName: 'Carlos V.', customerPhone: null,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(), estimatedReadyAt: null,
  },
  {
    id: 'd4', platform: DeliveryPlatform.JUSTO, externalOrderId: 'JUS-7712',
    status: DeliveryOrderStatus.DELIVERED, autoAccepted: true,
    items: [
      { name: 'Helado Fresa', quantity: 3, price: 3500, modifiers: [] },
    ],
    totalAmount: 10500, customerName: 'Ana L.', customerPhone: null,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(), estimatedReadyAt: null,
  },
]

const ALL_STATUSES = Object.values(DeliveryOrderStatus)

function minutesAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'ahora'
  if (diff === 1) return 'hace 1 min'
  return `hace ${diff} min`
}

export function DeliveryPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<DeliveryOrderStatus | 'all'>('all')
  const [filterPlatform, setFilterPlatform] = useState<DeliveryPlatform | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    api.get<{ data: DeliveryOrder[] }>('/api/v1/delivery/orders?branchId=default')
      .then(res => setOrders(res.data))
      .catch(() => { if (import.meta.env.DEV) setOrders(MOCK_ORDERS) })
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(orderId: string, newStatus: string) {
    setUpdating(orderId)
    setUpdateError('')
    try {
      await api.put(`/api/v1/delivery/orders/${orderId}/status`, { status: newStatus, note: null })
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: newStatus as DeliveryOrderStatus } : o,
      ))
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : 'Error al actualizar')
    } finally {
      setUpdating(null)
    }
  }

  const visible = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    if (filterPlatform !== 'all' && o.platform !== filterPlatform) return false
    return true
  })

  // Stats
  const active = orders.filter(o => ![DeliveryOrderStatus.DELIVERED, DeliveryOrderStatus.CANCELLED, DeliveryOrderStatus.REJECTED].includes(o.status))
  const countByPlatform = Object.values(DeliveryPlatform).map(p => ({
    platform: p,
    count: active.filter(o => o.platform === p).length,
  })).filter(x => x.count > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Delivery</h1>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            api.get<{ data: DeliveryOrder[] }>('/api/v1/delivery/orders?branchId=default')
              .then(res => setOrders(res.data))
              .catch(() => {})
              .finally(() => setLoading(false))
          }}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Actualizar
        </button>
      </div>

      {/* Active orders summary */}
      {countByPlatform.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {countByPlatform.map(({ platform, count }) => (
            <span
              key={platform}
              className={`px-3 py-1 rounded-full text-xs font-medium ${PLATFORM_COLOR[platform]}`}
            >
              {PLATFORM_LABEL[platform]} · {count} activo{count !== 1 ? 's' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as DeliveryOrderStatus | 'all')}
          className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-1.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="all">Todos los estados</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value as DeliveryPlatform | 'all')}
          className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-1.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="all">Todas las plataformas</option>
          {Object.values(DeliveryPlatform).map(p => (
            <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
          ))}
        </select>
      </div>

      {updateError && (
        <p className="text-sm text-[var(--color-danger)] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg px-4 py-2">
          {updateError}
        </p>
      )}

      {/* Order list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <p className="text-3xl mb-2">🛵</p>
          <p className="text-sm">Sin pedidos de delivery{filterStatus !== 'all' || filterPlatform !== 'all' ? ' con estos filtros' : ' por ahora'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(order => {
            const isOpen = expanded === order.id
            const nextActions = NEXT_STATUSES[order.status] ?? []
            const isDone = [DeliveryOrderStatus.DELIVERED, DeliveryOrderStatus.CANCELLED, DeliveryOrderStatus.REJECTED].includes(order.status)

            return (
              <div
                key={order.id}
                className={`rounded-xl border bg-[var(--color-surface)] transition-shadow ${
                  isDone ? 'opacity-60' : 'shadow-sm hover:shadow-md'
                } border-[var(--color-border)]`}
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3"
                >
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLOR[order.platform]}`}>
                    {PLATFORM_LABEL[order.platform]}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-[var(--color-text-primary)] text-sm">{order.externalOrderId}</span>
                    {order.customerName && (
                      <span className="ml-2 text-xs text-[var(--color-text-muted)]">{order.customerName}</span>
                    )}
                  </span>

                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>

                  <span className="shrink-0 text-sm font-semibold text-[var(--color-text-primary)]">
                    {formatCurrency(order.totalAmount)}
                  </span>

                  <span className="shrink-0 text-xs text-[var(--color-text-muted)] hidden sm:block">
                    {minutesAgo(order.createdAt)}
                  </span>

                  <span className="shrink-0 text-[var(--color-text-muted)] text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-3">
                    {/* Items */}
                    <ul className="space-y-1">
                      {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                          <span>
                            {item.quantity}× {item.name}
                            {item.modifiers.length > 0 && (
                              <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                                ({item.modifiers.join(', ')})
                              </span>
                            )}
                          </span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-[var(--color-text-muted)] space-x-3">
                        {order.customerPhone && <span>📞 {order.customerPhone}</span>}
                        {order.estimatedReadyAt && (
                          <span>⏱ Listo {minutesAgo(order.estimatedReadyAt).replace('hace', 'en')}</span>
                        )}
                        {order.autoAccepted && <span className="text-green-600 dark:text-green-400">Auto-aceptado</span>}
                      </div>

                      {/* Action buttons */}
                      {nextActions.length > 0 && (
                        <div className="flex gap-2">
                          {nextActions.map(action => (
                            <button
                              key={action.value}
                              type="button"
                              disabled={updating === order.id}
                              onClick={() => handleStatusChange(order.id, action.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                action.value === 'cancelled'
                                  ? 'border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-950/20'
                                  : 'bg-[var(--color-accent)] text-white hover:opacity-90'
                              }`}
                            >
                              {updating === order.id ? '...' : action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
