import { formatCurrency } from '@/shared/lib/currency'

/** Una fila de GET /reports/mix → paymentMethods. `method` es el enum PaymentMethod del backend. */
export interface PaymentMethodTotal {
  method: string
  total: number
  count: number
}

interface MethodGroup {
  id: string
  label: string
  methods: string[]
  color: string
  hint?: string
  /** Efectivo, tarjeta y delivery se muestran aunque estén en $0: son lo que se cuadra al cierre. */
  alwaysShow: boolean
}

const GROUPS: MethodGroup[] = [
  { id: 'cash',     label: 'Efectivo',  methods: ['CASH'],          color: '#10b981', alwaysShow: true },
  { id: 'card',     label: 'Tarjeta',   methods: ['CARD_TERMINAL'], color: '#6366f1', alwaysShow: true },
  { id: 'delivery', label: 'Delivery',  methods: ['DELIVERY'],      color: '#f59e0b', alwaysShow: true, hint: 'cobrado por la plataforma' },
  { id: 'transfer', label: 'QR / Transferencia', methods: ['TRANSFER', 'QR'], color: '#0ea5e9', alwaysShow: false },
  // Solo aparece si un pago dividido quedó sin partidas registradas (ventas viejas).
  { id: 'mixed',    label: 'Pago dividido', methods: ['MIXED'],     color: '#ec4899', alwaysShow: false },
]

/**
 * Cuánto entró por cada forma de pago en el rango de Reportes. Los pagos
 * divididos ya vienen repartidos desde el backend: el efectivo de un pago mitad
 * y mitad suma a Efectivo.
 *
 * Sin `methods` (backend sin el campo desplegado) no dibuja nada.
 */
export function PaymentMethodBreakdown({ methods }: { methods?: PaymentMethodTotal[] }) {
  if (!methods) return null

  const grandTotal = methods.reduce((s, m) => s + m.total, 0)
  const rows = GROUPS.map(g => {
    const matching = methods.filter(m => g.methods.includes(m.method))
    return {
      ...g,
      total: matching.reduce((s, m) => s + m.total, 0),
      count: matching.reduce((s, m) => s + m.count, 0),
    }
  }).filter(r => r.alwaysShow || r.total > 0)

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
        Forma de pago
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {rows.map(r => {
          const pct = grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0
          return (
            <div
              key={r.id}
              data-testid={`payment-${r.id}`}
              className="rounded-xl border border-[var(--color-border)] px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} aria-hidden="true" />
                <p className="text-xs text-[var(--color-text-muted)]">{r.label}</p>
              </div>
              <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums mt-1">
                {formatCurrency(r.total)}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                {pct}% · {r.count} {r.count === 1 ? 'orden' : 'órdenes'}
                {r.hint && <span> · {r.hint}</span>}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: r.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
