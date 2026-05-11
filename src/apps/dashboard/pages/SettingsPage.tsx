import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { ThemeToggle } from '@/shared/components/ThemeToggle'

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

interface DeliverySettings {
  rappiEnabled: boolean
  uberEatsEnabled: boolean
  didiFoodEnabled: boolean
  justoEnabled: boolean
  autoAccept: boolean
  deliverectChannelId: string
}

interface CfdiConfig {
  rfc: string
  businessName: string
  postalCode: string
  regimenFiscal: string
  pacProvider: string
  certificateLoaded: boolean
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

const MOCK_DELIVERY: DeliverySettings = {
  rappiEnabled: false, uberEatsEnabled: false, didiFoodEnabled: false,
  justoEnabled: false, autoAccept: true, deliverectChannelId: '',
}

const MOCK_CFDI: CfdiConfig = {
  rfc: '', businessName: '', postalCode: '', regimenFiscal: '601',
  pacProvider: 'facturama', certificateLoaded: false,
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

type Tab = 'general' | 'kitchen' | 'tables' | 'delivery' | 'cfdi'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'general',  label: 'General',  icon: '🏪' },
  { id: 'kitchen',  label: 'Cocina',   icon: '🍳' },
  { id: 'tables',   label: 'Mesas',    icon: '🗺️' },
  { id: 'delivery', label: 'Delivery', icon: '🛵' },
  { id: 'cfdi',     label: 'CFDI',     icon: '🧾' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [branch, setBranch] = useState<BranchSettings>(MOCK_BRANCH)
  const [kitchen, setKitchen] = useState<KitchenSettings>(MOCK_KITCHEN)
  const [tables, setTables] = useState<TablesSettings>(MOCK_TABLES)
  const [delivery, setDelivery] = useState<DeliverySettings>(MOCK_DELIVERY)
  const [cfdi, setCfdi] = useState<CfdiConfig>(MOCK_CFDI)

  useEffect(() => {
    const endpoints: Record<Tab, string> = {
      general:  '/api/v1/settings?branchId=default',
      kitchen:  '/api/v1/settings/kitchen?branchId=default',
      tables:   '/api/v1/settings/tables?branchId=default',
      delivery: '/api/v1/settings/delivery?branchId=default',
      cfdi:     '/api/v1/invoices/config?branchId=default',
    }
    const setters: Record<Tab, (d: unknown) => void> = {
      general:  d => setBranch(d as BranchSettings),
      kitchen:  d => setKitchen(d as KitchenSettings),
      tables:   d => setTables(d as TablesSettings),
      delivery: d => setDelivery(d as DeliverySettings),
      cfdi:     d => setCfdi(d as CfdiConfig),
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
      general:  '/api/v1/settings?branchId=default',
      kitchen:  '/api/v1/settings/kitchen?branchId=default',
      tables:   '/api/v1/settings/tables?branchId=default',
      delivery: '/api/v1/settings/delivery?branchId=default',
      cfdi:     '/api/v1/invoices/config/default',
    }
    const bodies: Record<Tab, unknown> = {
      general: branch, kitchen, tables, delivery, cfdi,
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

      {/* ── Delivery ── */}
      {tab === 'delivery' && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] space-y-4">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm uppercase tracking-wide">Plataformas de delivery</h2>
          <Toggle label="Rappi" checked={delivery.rappiEnabled} onChange={v => setDelivery(d => ({ ...d, rappiEnabled: v }))} />
          <Toggle label="Uber Eats" checked={delivery.uberEatsEnabled} onChange={v => setDelivery(d => ({ ...d, uberEatsEnabled: v }))} />
          <Toggle label="DiDi Food" checked={delivery.didiFoodEnabled} onChange={v => setDelivery(d => ({ ...d, didiFoodEnabled: v }))} />
          <Toggle label="Justo" checked={delivery.justoEnabled} onChange={v => setDelivery(d => ({ ...d, justoEnabled: v }))} />

          <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
            <Toggle label="Auto-aceptar pedidos" checked={delivery.autoAccept} onChange={v => setDelivery(d => ({ ...d, autoAccept: v }))} />
            <Field
              label="Deliverect Channel ID"
              value={delivery.deliverectChannelId}
              onChange={v => setDelivery(d => ({ ...d, deliverectChannelId: v }))}
              placeholder="ch_xxxxxxxxxxxx"
            />
          </div>
        </div>
      )}

      {/* ── CFDI ── */}
      {tab === 'cfdi' && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] space-y-4">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm uppercase tracking-wide">Facturación SAT (CFDI 4.0)</h2>
          <Field label="RFC emisor" value={cfdi.rfc} onChange={v => setCfdi(c => ({ ...c, rfc: v.toUpperCase() }))} placeholder="GACR850101ABC" />
          <Field label="Razón social" value={cfdi.businessName} onChange={v => setCfdi(c => ({ ...c, businessName: v }))} placeholder="Copo Helados SA de CV" />
          <Field label="Código postal fiscal" value={cfdi.postalCode} onChange={v => setCfdi(c => ({ ...c, postalCode: v }))} placeholder="06600" />
          <div>
            <label className="text-xs text-[var(--color-text-muted)] block mb-1">Régimen fiscal</label>
            <select
              value={cfdi.regimenFiscal}
              onChange={e => setCfdi(c => ({ ...c, regimenFiscal: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
            >
              {[
                { value: '601', label: '601 — General de Ley Personas Morales' },
                { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
                { value: '621', label: '621 — Incorporación Fiscal' },
                { value: '625', label: '625 — Régimen de Actividades con Plataformas Tecnológicas' },
              ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] block mb-1">Proveedor PAC</label>
            <select
              value={cfdi.pacProvider}
              onChange={e => setCfdi(c => ({ ...c, pacProvider: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
            >
              <option value="facturama">Facturama</option>
              <option value="finkok">Finkok</option>
              <option value="diverza">Diverza</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border)]">
            <div className={`w-2.5 h-2.5 rounded-full ${cfdi.certificateLoaded ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-[var(--color-text-secondary)]">
              {cfdi.certificateLoaded ? 'Certificado SAT cargado' : 'Sin certificado — contacta soporte para subir CSD'}
            </span>
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
