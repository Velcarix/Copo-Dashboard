import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { api } from '@/shared/lib/api'
import { useBranchStore } from '@/shared/store/branchStore'

type DashboardTab = 'config' | 'metrics'
type AuditAction = 'modify_order' | 'refund_order' | 'cancel_order'

interface AuditEntry {
  id: string
  userName: string
  action: AuditAction
  orderId: string
  detail: string | null
  timestamp: string
}

interface KitchenMetrics {
  avgTimeSeconds: number
  completedToday: number
  urgentCount: number
  peakHour: string
  peakHourCount: number
  avgByProduct: Array<{ product: string; avgMinutes: number; count: number }>
  slowestOrders: Array<{ orderNumber: string; product: string; minutes: number; time: string }>
  timeDistribution: Array<{ range: string; count: number }>
}

const ACTION_LABEL: Record<AuditAction, string> = {
  modify_order: 'Modificar',
  refund_order: 'Reembolsar',
  cancel_order: 'Cancelar',
}

const ACTION_COLOR: Record<AuditAction, string> = {
  modify_order: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
  refund_order: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400',
  cancel_order: 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400',
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>
    </div>
  )
}

export function KitchenDashboardPage() {
  const [tab, setTab] = useState<DashboardTab>('config')
  const { selectedId } = useBranchStore()
  const branchId = selectedId === 'ALL' ? null : selectedId

  // ── Config state ────────────────────────────────────────────────────────────
  const [maxTime, setMaxTime] = useState(10)
  const [savedTime, setSavedTime] = useState(10)
  const [saving, setSaving] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    if (!branchId) return
    api.get<{ data: { maxPrepTimeMinutes: number } }>(`/api/v1/kitchen/config?branchId=${branchId}`)
      .then(res => {
        const mins = res.data.maxPrepTimeMinutes
        setMaxTime(mins)
        setSavedTime(mins)
        localStorage.setItem('kitchen_max_prep_time', String(mins))
      })
      .catch(() => {
        const saved = localStorage.getItem('kitchen_max_prep_time')
        if (saved) { const v = parseInt(saved, 10); setMaxTime(v); setSavedTime(v) }
      })
      .finally(() => setConfigLoaded(true))
  }, [branchId])

  async function handleSave() {
    if (!branchId) return
    setSaving(true)
    try {
      await api.put(`/api/v1/kitchen/config/${branchId}`, { maxPrepTimeMinutes: maxTime })
      setSavedTime(maxTime)
      localStorage.setItem('kitchen_max_prep_time', String(maxTime))
    } catch {
      // keep local state, show no destructive error
    } finally {
      setSaving(false)
    }
  }

  // ── Metrics state ───────────────────────────────────────────────────────────
  const [metricsDate, setMetricsDate] = useState('')
  const [metrics, setMetrics] = useState<KitchenMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)

  const fetchMetrics = useCallback(() => {
    if (!branchId) return
    setMetricsLoading(true)
    const dateParam = metricsDate ? `&date=${metricsDate}` : ''
    api.get<{ data: KitchenMetrics }>(`/api/v1/kitchen/metrics?branchId=${branchId}${dateParam}`)
      .then(res => setMetrics(res.data))
      .catch(() => { /* keep previous data */ })
      .finally(() => setMetricsLoading(false))
  }, [branchId, metricsDate])

  useEffect(() => {
    if (tab === 'metrics') fetchMetrics()
  }, [tab, fetchMetrics])

  // ── Audit state ─────────────────────────────────────────────────────────────
  const [auditAction, setAuditAction] = useState<AuditAction | 'all'>('all')
  const [auditDate, setAuditDate] = useState('')
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const fetchAudit = useCallback(() => {
    if (!branchId) return
    setAuditLoading(true)
    const params = new URLSearchParams({ branchId })
    if (auditAction !== 'all') params.set('action', auditAction)
    if (auditDate) {
      params.set('from', new Date(auditDate + 'T00:00:00').toISOString())
      params.set('to',   new Date(auditDate + 'T23:59:59').toISOString())
    }
    api.get<{ data: AuditEntry[] }>(`/api/v1/kitchen/audit?${params}`)
      .then(res => setAuditEntries(res.data))
      .catch(() => { /* keep previous */ })
      .finally(() => setAuditLoading(false))
  }, [branchId, auditAction, auditDate])

  useEffect(() => {
    if (tab === 'metrics') fetchAudit()
  }, [tab, fetchAudit])

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'config',  label: 'Configuración' },
    { id: 'metrics', label: 'Métricas'      },
  ]

  const urgentPct = metrics && metrics.completedToday > 0
    ? ((metrics.urgentCount / metrics.completedToday) * 100).toFixed(1)
    : '0'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Cocina</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Panel de control de la cocina</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--color-surface)] rounded-xl p-1 border border-[var(--color-border)] w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONFIG ─────────────────────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] max-w-md">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
            Tiempo máximo de preparación
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Si una orden supera este tiempo se activa la alerta roja de urgencia.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={60}
              value={maxTime}
              onChange={e => setMaxTime(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={!configLoaded}
              className="w-24 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-center font-mono text-lg focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">minutos</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Tiempo guardado actualmente: <strong className="text-[var(--color-text-primary)]">{savedTime} min</strong>
          </p>
          {!branchId && (
            <p className="text-xs text-amber-600 mt-2">Selecciona una sucursal para guardar la configuración.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || maxTime === savedTime || !branchId}
            className="mt-5 px-5 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}

      {/* ── METRICS ────────────────────────────────────────────────────── */}
      {tab === 'metrics' && (
        <div className="space-y-5">
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--color-text-secondary)]">Fecha:</label>
            <input
              type="date"
              value={metricsDate}
              onChange={e => setMetricsDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            {metricsDate && (
              <button
                type="button"
                onClick={() => setMetricsDate('')}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Tiempo promedio"
              value={metrics ? `${(metrics.avgTimeSeconds / 60).toFixed(1)} min` : '—'}
              sub="Hoy"
            />
            <StatCard
              label="Órdenes completadas"
              value={metrics ? String(metrics.completedToday) : '—'}
              sub="Hoy"
            />
            <StatCard
              label="Órdenes urgentes"
              value={metrics ? String(metrics.urgentCount) : '—'}
              sub={metrics ? `${urgentPct} % del total` : ''}
            />
            <StatCard
              label="Hora pico"
              value={metrics?.peakHour ?? '—'}
              sub={metrics ? `${metrics.peakHourCount} órdenes / hora` : ''}
            />
          </div>

          {/* Distribution chart */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
              Distribución de tiempos de preparación
            </p>
            {metricsLoading ? (
              <div className="h-40 flex items-center justify-center text-sm text-[var(--color-text-muted)]">Cargando…</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={metrics?.timeDistribution ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v} órdenes`, 'Cantidad']}
                  />
                  <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Two tables */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Tiempo promedio por artículo</p>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-[var(--color-text-muted)] pb-2">Producto</th>
                    <th className="text-right text-xs text-[var(--color-text-muted)] pb-2">Prom.</th>
                    <th className="text-right text-xs text-[var(--color-text-muted)] pb-2"># Ord.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {(metrics?.avgByProduct ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-center text-xs text-[var(--color-text-muted)]">Sin datos</td></tr>
                  ) : (metrics?.avgByProduct ?? []).map(row => (
                    <tr key={row.product}>
                      <td className="py-2 text-[var(--color-text-primary)]">{row.product}</td>
                      <td className="py-2 text-right font-mono text-sm">{row.avgMinutes.toFixed(1)} min</td>
                      <td className="py-2 text-right text-[var(--color-text-muted)]">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Top órdenes más lentas</p>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-[var(--color-text-muted)] pb-2">Orden</th>
                    <th className="text-left text-xs text-[var(--color-text-muted)] pb-2">Producto</th>
                    <th className="text-right text-xs text-[var(--color-text-muted)] pb-2">Tiempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {(metrics?.slowestOrders ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-center text-xs text-[var(--color-text-muted)]">Sin datos</td></tr>
                  ) : (metrics?.slowestOrders ?? []).map(row => (
                    <tr key={row.orderNumber}>
                      <td className="py-2 font-mono text-xs text-[var(--color-text-primary)]">{row.orderNumber}</td>
                      <td className="py-2 text-[var(--color-text-secondary)] truncate max-w-[90px]">{row.product}</td>
                      <td className="py-2 text-right font-mono text-sm text-red-500 font-medium">{row.minutes.toFixed(1)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit trail */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Audit Trail</p>

            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={auditAction}
                onChange={e => setAuditAction(e.target.value as AuditAction | 'all')}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="all">Todas las acciones</option>
                <option value="modify_order">Modificar</option>
                <option value="refund_order">Reembolsar</option>
                <option value="cancel_order">Cancelar</option>
              </select>
              <input
                type="date"
                value={auditDate}
                onChange={e => setAuditDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              {(auditAction !== 'all' || auditDate) && (
                <button
                  type="button"
                  onClick={() => { setAuditAction('all'); setAuditDate('') }}
                  className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {['Usuario', 'Acción', 'Orden', 'Detalle', 'Hora'].map((h, i) => (
                      <th
                        key={h}
                        className={[
                          'px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide',
                          i === 4 ? 'text-right' : 'text-left',
                        ].join(' ')}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-[var(--color-text-muted)]">Cargando…</td>
                    </tr>
                  ) : auditEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-[var(--color-text-muted)]">
                        Sin registros para los filtros seleccionados
                      </td>
                    </tr>
                  ) : auditEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-[var(--color-border)]/30 transition-colors">
                      <td className="px-4 py-3 text-[var(--color-text-primary)] font-medium">{entry.userName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[entry.action]}`}>
                          {ACTION_LABEL[entry.action]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">{entry.orderId}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{entry.detail ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--color-text-muted)]">
                        {new Date(entry.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
