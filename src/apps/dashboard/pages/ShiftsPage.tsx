import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { ShiftStatus } from '@shared-types'
import { useAuthStore } from '@/shared/store/authStore'

interface ShiftRecord {
  id: string
  openedByName: string
  closedByName: string | null
  openedAt: string
  closedAt: string | null
  status: ShiftStatus
  openingCash: number
  expectedCash: number
  countedCash: number | null
  difference: number | null
  salesTotal: number
  ordersCount: number
  notes: string | null
}

const STATUS_LABEL: Record<ShiftStatus, string> = {
  [ShiftStatus.OPEN]:             'Abierto',
  [ShiftStatus.CLOSED_BALANCED]:  'Cuadrado',
  [ShiftStatus.CLOSED_SURPLUS]:   'Sobrante',
  [ShiftStatus.CLOSED_DEFICIT]:   'Faltante',
}

const STATUS_COLOR: Record<ShiftStatus, string> = {
  [ShiftStatus.OPEN]:             'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [ShiftStatus.CLOSED_BALANCED]:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [ShiftStatus.CLOSED_SURPLUS]:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  [ShiftStatus.CLOSED_DEFICIT]:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function dateRange(days: number) {
  const to = new Date()
  const from = new Date(Date.now() - days * 86400000)
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  }
}

const MOCK_SHIFTS: ShiftRecord[] = [
  {
    id: 's1', openedByName: 'María López', closedByName: null,
    openedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    closedAt: null, status: ShiftStatus.OPEN,
    openingCash: 50000, expectedCash: 187500,
    countedCash: null, difference: null,
    salesTotal: 137500, ordersCount: 18, notes: null,
  },
  {
    id: 's2', openedByName: 'Carlos Vega', closedByName: 'Carlos Vega',
    openedAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    closedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    status: ShiftStatus.CLOSED_BALANCED,
    openingCash: 50000, expectedCash: 312500,
    countedCash: 312500, difference: 0,
    salesTotal: 262500, ordersCount: 34, notes: null,
  },
  {
    id: 's3', openedByName: 'Ana Ruiz', closedByName: 'Admin Casino',
    openedAt: new Date(Date.now() - 50 * 3600000).toISOString(),
    closedAt: new Date(Date.now() - 42 * 3600000).toISOString(),
    status: ShiftStatus.CLOSED_DEFICIT,
    openingCash: 50000, expectedCash: 198500,
    countedCash: 196000, difference: -2500,
    salesTotal: 148500, ordersCount: 19, notes: 'Probablemente cambio equivocado',
  },
  {
    id: 's4', openedByName: 'Luis Méndez', closedByName: 'Luis Méndez',
    openedAt: new Date(Date.now() - 74 * 3600000).toISOString(),
    closedAt: new Date(Date.now() - 66 * 3600000).toISOString(),
    status: ShiftStatus.CLOSED_SURPLUS,
    openingCash: 50000, expectedCash: 245000,
    countedCash: 247500, difference: 2500,
    salesTotal: 195000, ordersCount: 26, notes: null,
  },
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DifferenceChip({ diff }: { diff: number | null }) {
  if (diff === null) return null
  if (diff === 0) return <span className="text-green-600 dark:text-green-400 font-medium text-sm">±$0</span>
  const abs = formatCurrency(Math.abs(diff))
  if (diff > 0) return <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">+{abs}</span>
  return <span className="text-red-600 dark:text-red-400 font-medium text-sm">-{abs}</span>
}

export function ShiftsPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!branchId) { setLoading(false); return }
    const { from, to } = dateRange(rangeDays)
    setLoading(true)
    api.get<{ data: ShiftRecord[] }>(`/api/v1/shifts?branchId=${branchId}&from=${from}&to=${to}`)
      .then(res => setShifts(res.data))
      .catch(() => { if (import.meta.env.DEV) setShifts(MOCK_SHIFTS) })
      .finally(() => setLoading(false))
  }, [rangeDays, branchId])

  // Aggregate stats
  const closed = shifts.filter(s => s.status !== ShiftStatus.OPEN)
  const totalSales = shifts.reduce((acc, s) => acc + s.salesTotal, 0)
  const totalOrders = shifts.reduce((acc, s) => acc + s.ordersCount, 0)
  const deficits = closed.filter(s => s.status === ShiftStatus.CLOSED_DEFICIT)
  const totalDiff = closed.reduce((acc, s) => acc + (s.difference ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Turnos / Caja</h1>

        {/* Range selector */}
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-sm">
          {([7, 14, 30] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setRangeDays(d)}
              className={`px-3 py-1.5 transition-colors ${
                rangeDays === d
                  ? 'bg-[var(--color-accent)] text-white font-medium'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {!loading && shifts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Ventas totales</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatCurrency(totalSales)}</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Órdenes</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{totalOrders}</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Diferencia neta</p>
            <p className={`text-lg font-bold ${totalDiff === 0 ? 'text-[var(--color-text-primary)]' : totalDiff > 0 ? 'text-amber-500' : 'text-red-500'}`}>
              {totalDiff > 0 ? '+' : ''}{formatCurrency(totalDiff)}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Turnos con faltante</p>
            <p className={`text-lg font-bold ${deficits.length > 0 ? 'text-red-500' : 'text-[var(--color-text-primary)]'}`}>
              {deficits.length}
            </p>
          </div>
        </div>
      )}

      {/* Shifts list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm">Sin turnos en los últimos {rangeDays} días</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map(shift => {
            const isOpen = expanded === shift.id

            return (
              <div
                key={shift.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
              >
                {/* Row */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : shift.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 flex-wrap"
                >
                  {/* Status */}
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[shift.status]}`}>
                    {STATUS_LABEL[shift.status]}
                  </span>

                  {/* Employee + time */}
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-[var(--color-text-primary)]">
                      {shift.openedByName}
                      {shift.closedByName && shift.closedByName !== shift.openedByName && (
                        <span className="text-[var(--color-text-muted)] font-normal"> → {shift.closedByName}</span>
                      )}
                    </span>
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      {formatDateTime(shift.openedAt)}
                      {shift.closedAt ? ` — ${formatDateTime(shift.closedAt)}` : ' (activo)'}
                    </span>
                  </span>

                  {/* Sales */}
                  <span className="shrink-0 text-sm font-semibold text-[var(--color-text-primary)]">
                    {formatCurrency(shift.salesTotal)}
                  </span>

                  {/* Difference */}
                  <span className="shrink-0">
                    <DifferenceChip diff={shift.difference} />
                  </span>

                  <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-[var(--color-border)] px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Abrió</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{shift.openedByName}</p>
                    </div>
                    {shift.closedByName && (
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Cerró</p>
                        <p className="font-medium text-[var(--color-text-primary)]">{shift.closedByName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Efectivo inicial</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{formatCurrency(shift.openingCash)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Efectivo esperado</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{formatCurrency(shift.expectedCash)}</p>
                    </div>
                    {shift.countedCash !== null && (
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Efectivo contado</p>
                        <p className="font-medium text-[var(--color-text-primary)]">{formatCurrency(shift.countedCash)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Ventas</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{formatCurrency(shift.salesTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Órdenes</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{shift.ordersCount}</p>
                    </div>
                    {shift.difference !== null && (
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Diferencia</p>
                        <DifferenceChip diff={shift.difference} />
                      </div>
                    )}
                    {shift.notes && (
                      <div className="col-span-2 sm:col-span-3 mt-1">
                        <p className="text-xs text-[var(--color-text-muted)]">Notas</p>
                        <p className="text-[var(--color-text-secondary)] text-sm italic">"{shift.notes}"</p>
                      </div>
                    )}
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
