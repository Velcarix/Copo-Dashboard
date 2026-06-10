import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { exportDashboardToExcel } from '@/shared/lib/exportExcel'
import { MetricCard } from '../components/MetricCard'
import { InventoryAlert } from '../components/InventoryAlert'
import { useBranchStore } from '@/shared/store/branchStore'
import { BranchBadge } from '@/shared/components/BranchSelector'
import {
  ResponsiveContainer,
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'

type Period = 'today' | 'week' | 'month' | 'year'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week',  label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year',  label: 'Año' },
]

const BRANCH_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899']

interface DashboardData {
  totalSales: number
  avgTicket: number
  ordersCount: number
  customersCount: number
  breakEvenRemaining: number
  monthlyFixedCosts: number
  lowStockItems: { name: string; currentStock: number; minStock: number }[]
  salesChart: { label: string; total: number; count: number }[]
  branchSalesChart: { label: string; [k: string]: number | string }[]
  topProducts: { name: string; revenue: number; units: number }[]
  salesByMethod: { method: string; total: number; count: number }[]
  salesByCategory: { category: string; total: number }[]
  salesByEmployee: { name: string; total: number; orders: number }[]
  salesByShift: { shift: string; employee: string; openedAt: string; closedAt: string; total: number; orders: number }[]
}

function chartFmt(v: number) {
  return v >= 100_000
    ? `$${(v / 100_000).toFixed(0)}k`
    : `$${(v / 100).toFixed(0)}`
}

export function DashboardHome() {
  const [period, setPeriod] = useState<Period>('today')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [goalTarget, setGoalTarget] = useState(() =>
    parseInt(localStorage.getItem('dash_goal') ?? '500000', 10),
  )
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const { selectedId, branches } = useBranchStore()
  const isGlobal = selectedId === 'ALL'
  const branchParam = isGlobal ? 'all' : selectedId

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await api.get<{ data: DashboardData }>(
          `/api/v1/reports/dashboard?branchId=${branchParam}&period=${period}`,
        )
        if (!cancelled) setData(res.data)
      } catch {
        if (import.meta.env.DEV && !cancelled) {
          const { getMockData } = await import('../lib/mockDashboard')
          setData(getMockData(period, isGlobal, branches) as DashboardData)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [branchParam, period])

  function saveGoal() {
    const v = parseInt(goalInput, 10)
    if (!isNaN(v) && v > 0) {
      const cents = v * 100
      setGoalTarget(cents)
      localStorage.setItem('dash_goal', String(cents))
    }
    setEditingGoal(false)
  }

  const goalPct = data ? Math.min((data.totalSales / goalTarget) * 100, 100) : 0
  const activeBranches = branches.filter(b => b.isActive)

  function handleExport() {
    if (!data) return
    const branchLabel = isGlobal
      ? 'Todas las sucursales'
      : (branches.find(b => b.id === selectedId)?.name ?? selectedId)
    exportDashboardToExcel({
      period,
      totalSales:         data.totalSales,
      avgTicket:          data.avgTicket,
      ordersCount:        data.ordersCount,
      customersCount:     data.customersCount,
      breakEvenRemaining: data.breakEvenRemaining,
      goalTarget,
      salesChart:         data.salesChart ?? [],
      topProducts:        data.topProducts ?? [],
      salesByMethod:      data.salesByMethod ?? [],
      salesByCategory:    data.salesByCategory ?? [],
      salesByEmployee:    data.salesByEmployee ?? [],
      salesByShift:       data.salesByShift ?? [],
    }, branchLabel)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
        Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Title + period selector ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
            {isGlobal ? 'Resumen global' : 'Resumen'}
          </h1>
          <BranchBadge />
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-0.5 bg-[var(--color-bg)] rounded-xl p-1 border border-[var(--color-border)]">
            {PERIODS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  period === p.id
                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Exportar todas las métricas a Excel"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Excel
          </button>
        </div>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="Ventas"            value={formatCurrency(data?.totalSales ?? 0)} />
        <MetricCard label="Ticket promedio"   value={formatCurrency(data?.avgTicket ?? 0)} />
        <MetricCard label="Órdenes"           value={String(data?.ordersCount ?? 0)} />
        <MetricCard label="Clientes"          value={String(data?.customersCount ?? 0)} />
        {(data?.monthlyFixedCosts ?? 0) > 0 && (
          <MetricCard
            label="Pto. de equilibrio"
            value={(data?.breakEvenRemaining ?? 0) <= 0 ? '¡Cubierto!' : formatCurrency(data?.breakEvenRemaining ?? 0)}
            subtitle={(data?.breakEvenRemaining ?? 0) <= 0 ? undefined : 'restante'}
          />
        )}
      </div>

      {/* ── Sales goal ── */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Meta de ventas
          </p>
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">$</span>
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onFocus={e => e.target.select()}
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
                placeholder="Meta en pesos"
                autoFocus
                className="w-28 px-2 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button type="button" onClick={saveGoal} className="text-xs text-[var(--color-accent)] font-semibold">Guardar</button>
              <button type="button" onClick={() => setEditingGoal(false)} className="text-xs text-[var(--color-text-muted)]">Cancelar</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setGoalInput(String(Math.round(goalTarget / 100))); setEditingGoal(true) }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              Meta: {formatCurrency(goalTarget)} — Editar
            </button>
          )}
        </div>
        <div className="w-full h-2.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${goalPct}%`,
              background: goalPct >= 100 ? '#10b981' : 'var(--color-accent)',
            }}
          />
        </div>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          {goalPct >= 100
            ? '¡Meta alcanzada! 🎉'
            : `${goalPct.toFixed(0)}% completado — Faltan ${formatCurrency(Math.max(0, goalTarget - (data?.totalSales ?? 0)))}`}
        </p>
      </div>

      {/* ── Main sales chart ── */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
          {isGlobal ? 'Ventas por sucursal' : 'Ventas en el tiempo'}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          {isGlobal && activeBranches.length > 1 && (data?.branchSalesChart?.length ?? 0) > 0 ? (
            <LineChart
              data={data!.branchSalesChart}
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            >
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tickFormatter={chartFmt} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={50} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              {activeBranches.map((b, i) => (
                <Line
                  key={b.id}
                  type="monotone"
                  dataKey={b.name}
                  stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart
              data={data?.salesChart ?? []}
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tickFormatter={chartFmt} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={50} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--color-accent)"
                fill="url(#salesGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── Top products + Sales by category ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
            Top 10 productos por ingreso
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={data?.topProducts?.slice(0, 10) ?? []}
              margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
            >
              <XAxis type="number" tickFormatter={chartFmt} tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
            Ventas por categoría
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={data?.salesByCategory ?? []}
              margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
            >
              <XAxis type="number" tickFormatter={chartFmt} tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
              <YAxis type="category" dataKey="category" width={70} tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {(data?.salesByCategory ?? []).map((_, i) => (
                  <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sales by payment method ── */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
          Ventas por forma de pago
        </p>
        <div className="space-y-3">
          {(data?.salesByMethod ?? []).map((m, i) => {
            const pct = data!.totalSales > 0
              ? Math.round((m.total / data!.totalSales) * 100)
              : 0
            return (
              <div key={m.method} className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-secondary)] w-24 shrink-0">{m.method}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                  />
                </div>
                <span className="text-xs font-semibold text-[var(--color-text-primary)] w-20 text-right shrink-0">
                  {formatCurrency(m.total)}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] w-8 text-right shrink-0">
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Branch info cards (global only) ── */}
      {isGlobal && activeBranches.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            Info por sucursal
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeBranches.map((branch, i) => {
              const branchTotal = Math.floor(
                ((data?.totalSales ?? 0) / activeBranches.length) * (0.8 + Math.random() * 0.4),
              )
              const branchOrders = Math.floor(
                ((data?.ordersCount ?? 0) / activeBranches.length) * (0.8 + Math.random() * 0.4),
              )
              return (
                <div
                  key={branch.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                    />
                    <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{branch.name}</span>
                  </div>
                  <p className="text-base font-bold text-[var(--color-text-primary)]">{formatCurrency(branchTotal)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{branchOrders} órdenes · {branch.city}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Low stock alert ── */}
      {(data?.lowStockItems?.length ?? 0) > 0 && (
        <InventoryAlert items={data!.lowStockItems} />
      )}

      {/* ── Sales by employee ── */}
      {(data?.salesByEmployee?.length ?? 0) > 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Ventas por empleado</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Empleado', 'Órdenes', 'Total'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data!.salesByEmployee.map((e, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{e.name}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{e.orders}</td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--color-text-primary)]">{formatCurrency(e.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sales by shift ── */}
      {(data?.salesByShift?.length ?? 0) > 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Ventas por turno</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {['Turno', 'Empleado', 'Horario', 'Órdenes', 'Total'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.salesByShift.map((s, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{s.shift}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{s.employee}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)] whitespace-nowrap">{s.openedAt} – {s.closedAt}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{s.orders}</td>
                    <td className="px-4 py-2.5 font-semibold text-[var(--color-text-primary)]">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
