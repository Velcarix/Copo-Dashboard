import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { useAuthStore } from '@/shared/store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchSettings {
  name: string
  address: string
  phone: string
  currency: string
  timezone: string
}

interface KitchenSettings {
  printerEnabled: boolean
  printerIp: string
  displayEnabled: boolean
  soundAlerts: boolean
  autoAcceptOrders: boolean
}

interface TablesSettings {
  comanderoEnabled: boolean
  autoSendToKitchen: boolean
  requireGuestCount: boolean
  allowWaiterToAddTables: boolean
  defaultTipPercent: number
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const MOCK_BRANCH: BranchSettings = {
  name: 'Copo Helados', address: 'Calle Reforma 123, CDMX',
  phone: '55 1234 5678', currency: 'MXN', timezone: 'America/Mexico_City',
}

const MOCK_KITCHEN: KitchenSettings = {
  printerEnabled: false, printerIp: '', displayEnabled: true,
  soundAlerts: true, autoAcceptOrders: false,
}

const MOCK_TABLES: TablesSettings = {
  comanderoEnabled: true, autoSendToKitchen: true,
  requireGuestCount: true, allowWaiterToAddTables: false, defaultTipPercent: 0,
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-[var(--color-text-muted)] block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
    </div>
  )
}

type Tab = 'general' | 'kitchen' | 'tables'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'general',  label: 'General',  icon: '🏪' },
  { id: 'kitchen',  label: 'Cocina',   icon: '🍳' },
  { id: 'tables',   label: 'Mesas',    icon: '🗺️' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [tab, setTab] = useState<Tab>('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [branch, setBranch] = useState<BranchSettings>(MOCK_BRANCH)
  const [kitchen, setKitchen] = useState<KitchenSettings>(MOCK_KITCHEN)
  const [tables, setTables] = useState<TablesSettings>(MOCK_TABLES)

  useEffect(() => {
    if (!branchId) return
    const endpoints: Record<Tab, string> = {
      general:  `/api/v1/settings?branchId=${branchId}`,
      kitchen:  `/api/v1/settings/kitchen?branchId=${branchId}`,
      tables:   `/api/v1/settings/tables?branchId=${branchId}`,
    }
    const setters: Record<Tab, (d: unknown) => void> = {
      general:  d => setBranch(d as BranchSettings),
      kitchen:  d => setKitchen(d as KitchenSettings),
      tables:   d => setTables(d as TablesSettings),
    }
    api.get<{ data: unknown }>(endpoints[tab])
      .then(res => setters[tab](res.data))
      .catch(() => { /* use mock defaults already in state */ })
  }, [tab])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const endpoints: Record<Tab, string> = {
      general:  `/api/v1/settings?branchId=${branchId}`,
      kitchen:  `/api/v1/settings/kitchen?branchId=${branchId}`,
      tables:   `/api/v1/settings/tables?branchId=${branchId}`,
    }
    const bodies: Record<Tab, unknown> = {
      general: branch, kitchen, tables,
    }

    try {
      await api.put(endpoints[tab], bodies[tab])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      if (import.meta.env.DEV) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError(err instanceof ApiError ? err.message : 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Configuración</h1>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] p-1 bg-[var(--color-surface)] w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setError(''); setSaved(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {tab === 'general' && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] space-y-4">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm uppercase tracking-wide">Negocio</h2>
          <Field label="Nombre del negocio" value={branch.name} onChange={v => setBranch(b => ({ ...b, name: v }))} />
          <Field label="Dirección" value={branch.address} onChange={v => setBranch(b => ({ ...b, address: v }))} />
          <Field label="Teléfono" value={branch.phone} type="tel" onChange={v => setBranch(b => ({ ...b, phone: v }))} />
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)]">Tema de la interfaz</p>
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* ── Cocina ── */}
      {tab === 'kitchen' && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] space-y-4">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm uppercase tracking-wide">Pantalla de cocina</h2>
          <Toggle label="Pantalla activa" checked={kitchen.displayEnabled} onChange={v => setKitchen(k => ({ ...k, displayEnabled: v }))} />
          <Toggle label="Alertas de sonido" checked={kitchen.soundAlerts} onChange={v => setKitchen(k => ({ ...k, soundAlerts: v }))} />
          <Toggle label="Auto-aceptar órdenes" checked={kitchen.autoAcceptOrders} onChange={v => setKitchen(k => ({ ...k, autoAcceptOrders: v }))} />

          <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Impresora térmica</h3>
            <Toggle label="Impresora habilitada" checked={kitchen.printerEnabled} onChange={v => setKitchen(k => ({ ...k, printerEnabled: v }))} />
            {kitchen.printerEnabled && (
              <Field
                label="IP de la impresora"
                value={kitchen.printerIp}
                onChange={v => setKitchen(k => ({ ...k, printerIp: v }))}
                placeholder="192.168.1.100"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Mesas ── */}
      {tab === 'tables' && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] space-y-4">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm uppercase tracking-wide">Comandero y mesas</h2>
          <Toggle label="Módulo comandero activo" checked={tables.comanderoEnabled} onChange={v => setTables(t => ({ ...t, comanderoEnabled: v }))} />
          <Toggle label="Enviar automáticamente a cocina" checked={tables.autoSendToKitchen} onChange={v => setTables(t => ({ ...t, autoSendToKitchen: v }))} />
          <Toggle label="Pedir número de comensales al abrir mesa" checked={tables.requireGuestCount} onChange={v => setTables(t => ({ ...t, requireGuestCount: v }))} />
          <Toggle label="Permitir a mesero agregar mesas" checked={tables.allowWaiterToAddTables} onChange={v => setTables(t => ({ ...t, allowWaiterToAddTables: v }))} />
          <div>
            <label className="text-xs text-[var(--color-text-muted)] block mb-1">Propina predeterminada (%)</label>
            <input
              type="number"
              min={0}
              max={30}
              step={1}
              value={tables.defaultTipPercent}
              onChange={e => setTables(t => ({ ...t, defaultTipPercent: Number(e.target.value) }))}
              className="w-32 text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--color-success)]">✓ Cambios guardados</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-40"
      >
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}
