import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { useAuthStore } from '@/shared/store/authStore'

interface Invoice {
  id: string
  uuid: string
  folio: string
  xmlUrl: string | null
  pdfUrl: string | null
  totalAmount: number
  status: 'active' | 'cancelled'
  orderId: string | null
  customerName: string
  customerRfc: string
  createdAt: string
}

interface IssueForm {
  rfc: string
  name: string
  email: string
  postalCode: string
  regimenFiscal: string
  usoCfdi: string
  orderId: string
}

const MOTIVOS_CANCELACION = [
  { value: '01', label: '01 — Comprobante emitido con errores con relación' },
  { value: '02', label: '02 — Comprobante emitido con errores sin relación' },
  { value: '03', label: '03 — No se llevó a cabo la operación' },
  { value: '04', label: '04 — Operación nominativa relacionada en una factura global' },
]

const USO_CFDI_OPTIONS = [
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'I01', label: 'I01 — Construcciones' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 — Pagos' },
]

const REGIMEN_FISCAL_OPTIONS = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '603', label: '603 — Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 — Sueldos y Salarios' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
  { value: '621', label: '621 — Incorporación Fiscal' },
  { value: '625', label: '625 — Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
]

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv1', uuid: 'ab12cd34-ef56-7890-abcd-ef1234567890',
    folio: 'A-000001', xmlUrl: null, pdfUrl: null,
    totalAmount: 18500, status: 'active',
    orderId: 'ord-001', customerName: 'Empresa XYZ SA de CV', customerRfc: 'EXYZ010101ABC',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'inv2', uuid: 'bc23de45-fg67-8901-bcde-fg2345678901',
    folio: 'A-000002', xmlUrl: null, pdfUrl: null,
    totalAmount: 7500, status: 'cancelled',
    orderId: 'ord-002', customerName: 'Juan García', customerRfc: 'GAJN850101XYZ',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'inv3', uuid: 'cd34ef56-gh78-9012-cdef-gh3456789012',
    folio: 'A-000003', xmlUrl: null, pdfUrl: null,
    totalAmount: 35000, status: 'active',
    orderId: null, customerName: 'Distribuidora Norte SA', customerRfc: 'DNO010101MXN',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

const EMPTY_FORM: IssueForm = {
  rfc: '', name: '', email: '', postalCode: '', regimenFiscal: '616', usoCfdi: 'G03', orderId: '',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function InvoicesPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Issue form
  const [showIssue, setShowIssue] = useState(false)
  const [form, setForm] = useState<IssueForm>(EMPTY_FORM)
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState('')

  // Cancel modal
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('01')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get<{ data: Invoice[]; total: number }>(`/api/v1/invoices?branchId=${branchId}&page=${page}&limit=20`)
      .then(res => { setInvoices(res.data); setTotal(res.total) })
      .catch(() => { if (import.meta.env.DEV) { setInvoices(MOCK_INVOICES); setTotal(MOCK_INVOICES.length) } })
      .finally(() => setLoading(false))
  }, [page])

  async function handleIssue() {
    if (!form.rfc || !form.name || !form.email || !form.postalCode) {
      setIssueError('Completa RFC, razón social, email y CP')
      return
    }
    setIssuing(true)
    setIssueError('')
    try {
      const body = {
        branchId: branchId ?? '',
        orderId: form.orderId || null,
        sessionId: null,
        customer: {
          rfc: form.rfc.toUpperCase(),
          name: form.name,
          email: form.email,
          domicilioFiscalReceptor: form.postalCode,
          regimenFiscalReceptor: form.regimenFiscal,
          usoCfdi: form.usoCfdi,
        },
      }
      const res = await api.post<{ data: Invoice }>('/api/v1/invoices', body)
      setInvoices(prev => [res.data, ...prev])
      setShowIssue(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      if (import.meta.env.DEV) {
        const mock: Invoice = {
          id: `inv-${Date.now()}`, uuid: crypto.randomUUID(),
          folio: `A-${String(invoices.length + 1).padStart(6, '0')}`,
          xmlUrl: null, pdfUrl: null, totalAmount: 10000,
          status: 'active', orderId: form.orderId || null,
          customerName: form.name, customerRfc: form.rfc.toUpperCase(),
          createdAt: new Date().toISOString(),
        }
        setInvoices(prev => [mock, ...prev])
        setShowIssue(false)
        setForm(EMPTY_FORM)
      } else {
        setIssueError(err instanceof ApiError ? err.message : 'Error al timbrar factura')
      }
    } finally {
      setIssuing(false)
    }
  }

  async function handleCancel() {
    if (!cancelId) return
    setCancelling(true)
    setCancelError('')
    try {
      await api.post(`/api/v1/invoices/${cancelId}/cancel`, { motivoCancelacion: motivo, folioSustituto: null })
      setInvoices(prev => prev.map(i => i.id === cancelId ? { ...i, status: 'cancelled' as const } : i))
      setCancelId(null)
    } catch (err) {
      if (import.meta.env.DEV) {
        setInvoices(prev => prev.map(i => i.id === cancelId ? { ...i, status: 'cancelled' as const } : i))
        setCancelId(null)
      } else {
        setCancelError(err instanceof ApiError ? err.message : 'Error al cancelar')
      }
    } finally {
      setCancelling(false)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Facturas CFDI</h1>
        <button
          type="button"
          onClick={() => { setShowIssue(true); setIssueError('') }}
          className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Nueva factura
        </button>
      </div>

      {/* Issue form */}
      {showIssue && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--color-text-primary)] text-sm">Emitir factura</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'rfc', label: 'RFC', placeholder: 'XAXX010101000' },
              { key: 'name', label: 'Razón social', placeholder: 'Empresa SA de CV' },
              { key: 'email', label: 'Correo electrónico', placeholder: 'factura@empresa.mx' },
              { key: 'postalCode', label: 'Código postal fiscal', placeholder: '06600' },
              { key: 'orderId', label: 'ID de orden (opcional)', placeholder: 'uuid de la orden' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs text-[var(--color-text-muted)] block mb-1">{field.label}</label>
                <input
                  value={form[field.key as keyof IssueForm]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
            ))}

            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Régimen fiscal</label>
              <select
                value={form.regimenFiscal}
                onChange={e => setForm(f => ({ ...f, regimenFiscal: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                {REGIMEN_FISCAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Uso CFDI</label>
              <select
                value={form.usoCfdi}
                onChange={e => setForm(f => ({ ...f, usoCfdi: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                {USO_CFDI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {issueError && <p className="text-sm text-[var(--color-danger)]">{issueError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleIssue}
              disabled={issuing}
              className="px-5 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {issuing ? 'Timbrando…' : 'Timbrar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowIssue(false); setForm(EMPTY_FORM); setIssueError('') }}
              className="px-5 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-sm">Sin facturas emitidas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <div
              key={inv.id}
              className={`rounded-xl border bg-[var(--color-surface)] px-4 py-3 flex flex-wrap items-center gap-3 ${
                inv.status === 'cancelled' ? 'opacity-60 border-[var(--color-border)]' : 'border-[var(--color-border)] shadow-sm'
              }`}
            >
              {/* Status */}
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                inv.status === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400'
              }`}>
                {inv.status === 'active' ? 'Activa' : 'Cancelada'}
              </span>

              {/* Folio + customer */}
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-[var(--color-text-primary)]">{inv.folio}</span>
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">{inv.customerName}</span>
                <span className="ml-1 text-xs text-[var(--color-text-muted)] hidden sm:inline">· {inv.customerRfc}</span>
              </div>

              {/* Amount */}
              <span className="shrink-0 text-sm font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(inv.totalAmount)}
              </span>

              {/* Date */}
              <span className="shrink-0 text-xs text-[var(--color-text-muted)] hidden sm:block">
                {formatDate(inv.createdAt)}
              </span>

              {/* Actions */}
              <div className="shrink-0 flex gap-1.5">
                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                  >
                    PDF
                  </a>
                )}
                {inv.xmlUrl && (
                  <a
                    href={inv.xmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                  >
                    XML
                  </a>
                )}
                {inv.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => { setCancelId(inv.id); setMotivo('01'); setCancelError('') }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm disabled:opacity-40"
          >
            ←
          </button>
          <span className="px-3 py-1.5 text-sm text-[var(--color-text-muted)]">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}

      {/* Cancel modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-[var(--color-text-primary)]">Cancelar factura</h3>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Motivo de cancelación SAT</label>
              <select
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]"
              >
                {MOTIVOS_CANCELACION.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {cancelError && <p className="text-sm text-[var(--color-danger)]">{cancelError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-danger)] text-white text-sm font-semibold disabled:opacity-50"
              >
                {cancelling ? 'Cancelando…' : 'Cancelar factura'}
              </button>
              <button
                type="button"
                onClick={() => setCancelId(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
