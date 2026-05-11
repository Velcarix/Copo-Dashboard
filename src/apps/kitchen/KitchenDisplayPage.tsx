import { useReducer, useEffect, useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { useAuthStore } from '@/shared/store/authStore'

type KitchenOrderStatus = 'new' | 'preparing'

interface KitchenOrder {
  id: string
  orderNumber: number
  items: string[]
  sentToKitchenAt: string
  isModified: boolean
  maxPreparationTime?: number
  status: KitchenOrderStatus
}

// Mock orders — replaced by API response once backend is connected
const INITIAL_MOCK_ORDERS: KitchenOrder[] = [
  {
    id: 'ko-1', orderNumber: 5,
    items: ['Café Americano x2', 'Waffle Chocolate'],
    sentToKitchenAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    isModified: false, status: 'preparing',
  },
  {
    id: 'ko-2', orderNumber: 6,
    items: ['Copa Especial Vainilla', 'Brownie x2'],
    sentToKitchenAt: new Date(Date.now() - 13 * 60_000).toISOString(),
    isModified: true, status: 'new',
  },
  {
    id: 'ko-3', orderNumber: 7,
    items: ['Frappé Moka', 'Croissant Mantequilla'],
    sentToKitchenAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    isModified: false, status: 'new',
  },
  {
    id: 'ko-4', orderNumber: 8,
    items: ['Mango con Chile x3'],
    sentToKitchenAt: new Date(Date.now() - 1 * 60_000).toISOString(),
    isModified: false, status: 'new',
  },
]

function getElapsedSeconds(sentAt: string): number {
  return Math.floor((Date.now() - new Date(sentAt).getTime()) / 1000)
}

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatReceivedTime(sentAt: string): string {
  return new Date(sentAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function KitchenDisplayPage() {
  // Force re-render every second so timers stay live
  const [, tick] = useReducer(x => x + 1, 0)
  const [orders, setOrders] = useState<KitchenOrder[]>(INITIAL_MOCK_ORDERS)
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const branchId = useAuthStore(s => s.branchId)

  const maxTime = (() => {
    const saved = localStorage.getItem('kitchen_max_prep_time')
    return saved ? parseInt(saved, 10) : 10
  })()

  const fetchOrders = useCallback(() => {
    if (!branchId) return
    api.get<{ data: KitchenOrder[] }>(`/api/v1/kitchen/orders?branchId=${branchId}`)
      .then(res => setOrders(res.data))
      .catch(() => { /* keep mock data on error */ })
  }, [branchId])

  // Tick every second
  useEffect(() => {
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch immediately on mount, then poll every 10 seconds
  useEffect(() => {
    fetchOrders()
    const id = setInterval(fetchOrders, 10_000)
    return () => clearInterval(id)
  }, [fetchOrders])

  async function handleStartPreparing(orderId: string) {
    try {
      await api.post(`/api/v1/kitchen/orders/${orderId}/start`, {})
    } catch { /* dev: proceed anyway */ }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' as KitchenOrderStatus } : o))
  }

  async function handleComplete(orderId: string) {
    setCompletingIds(prev => new Set(prev).add(orderId))
    try {
      await api.post(`/api/v1/kitchen/orders/${orderId}/complete`, {})
    } catch { /* dev: proceed anyway */ }
    setTimeout(() => {
      setOrders(prev => prev.filter(o => o.id !== orderId))
      setCompletingIds(prev => { const s = new Set(prev); s.delete(orderId); return s })
    }, 350)
  }

  return (
    <>
      {/* Keyframe animations injected once per mount */}
      <style>{`
        @keyframes urgent-flash {
          0%, 100% { background-color: #dc2626; color: #ffffff; }
          50%       { background-color: #991b1b; color: #ffffff; }
        }
        .timer-urgent {
          animation: urgent-flash 0.6s infinite;
          border-radius: 8px;
          padding: 4px 16px;
          display: inline-block;
        }
        @keyframes card-out {
          to { opacity: 0; transform: scale(0.95); }
        }
        .card-completing {
          animation: card-out 0.35s ease-out forwards;
          pointer-events: none;
        }
      `}</style>

      <div className="min-h-full p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {orders.length === 0
                ? 'Sin órdenes pendientes'
                : `${orders.length} orden${orders.length !== 1 ? 'es' : ''} en preparación`}
            </h1>
          </div>
          <div className="text-xs text-right text-[var(--color-text-muted)]">
            <span>Tiempo máx: </span>
            <strong className="text-[var(--color-text-secondary)]">{maxTime} min</strong>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="mb-3 opacity-25">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <p className="text-base font-medium">La cocina está al día</p>
            <p className="text-sm mt-1 opacity-60">Las nuevas órdenes aparecerán aquí</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}
          >
            {orders.map(order => {
              const elapsed = getElapsedSeconds(order.sentToKitchenAt)
              const isUrgent = elapsed > maxTime * 60 || order.isModified
              const isCompleting = completingIds.has(order.id)

              return (
                <div
                  key={order.id}
                  className={[
                    'bg-[var(--color-surface)] rounded-2xl border flex flex-col overflow-hidden',
                    isUrgent ? 'border-red-500' : 'border-[var(--color-border)]',
                    isCompleting ? 'card-completing' : '',
                  ].join(' ')}
                >
                  {/* Card header */}
                  <div className={[
                    'flex items-center justify-between px-4 py-3 border-b',
                    isUrgent
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                      : 'border-[var(--color-border)]',
                  ].join(' ')}>
                    <span className="font-bold text-[var(--color-text-primary)] tracking-wide">
                      ORDEN #{order.orderNumber}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatReceivedTime(order.sentToKitchenAt)}
                    </span>
                  </div>

                  {/* Timer */}
                  <div className="flex flex-col items-center py-4 border-b border-[var(--color-border)]">
                    <span
                      className={[
                        'font-mono font-bold text-4xl tracking-widest leading-none',
                        isUrgent ? 'timer-urgent' : 'text-[var(--color-text-primary)]',
                      ].join(' ')}
                    >
                      {formatElapsed(elapsed)}
                    </span>
                    {order.isModified && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500 uppercase tracking-wide">
                        Pedido modificado
                      </p>
                    )}
                  </div>

                  {/* Items */}
                  <ul className="px-4 py-3 flex-1 space-y-1.5">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
                        <span className="text-[var(--color-text-muted)] shrink-0 mt-px">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action buttons */}
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    {order.status === 'new' && (
                      <button
                        type="button"
                        onClick={() => handleStartPreparing(order.id)}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm tracking-wide transition-all"
                      >
                        ▶ EMPEZAR A PREPARAR
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <>
                        <div className="w-full h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center gap-2">
                          <span className="text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide">⏳ EN PREPARACIÓN</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleComplete(order.id)}
                          disabled={isCompleting}
                          className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold text-sm tracking-wide transition-all disabled:opacity-50"
                        >
                          ✓ COMPLETAR
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
