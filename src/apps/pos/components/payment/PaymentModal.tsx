import { useState } from 'react'
import { Printer } from 'lucide-react'
import { useCartStore } from '@/shared/store/cartStore'
import { useAuthStore } from '@/shared/store/authStore'
import { useNetworkStore } from '@/shared/store/networkStore'
import { api, ApiError } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { PaymentMethod, PaymentStatus, OrderSource } from '@shared-types'
import type { CreateOrderDto, OrderResponse, ApiResponse, TerminalIntentResponse, CartItemModifier } from '@shared-types'
import { CashFlow } from './CashFlow'
import { TerminalWaiting } from './TerminalWaiting'
import { v4 as uuidv4 } from 'uuid'

type Step = 'select' | 'cash' | 'qr' | 'terminal' | 'invoice-ask' | 'invoice-form' | 'invoice-done'

const USO_CFDI_OPTIONS = [
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 — Pagos' },
  { value: 'I01', label: 'I01 — Construcciones' },
]

const REGIMEN_FISCAL_OPTIONS = [
  { value: '616', label: '616 — Sin obligaciones fiscales' },
  { value: '612', label: '612 — Personas Físicas con Act. Empresariales' },
  { value: '621', label: '621 — Incorporación Fiscal' },
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '605', label: '605 — Sueldos y Salarios' },
]

interface InvoiceForm {
  rfc: string
  name: string
  email: string
  postalCode: string
  regimenFiscal: string
  usoCfdi: string
}

const EMPTY_INVOICE: InvoiceForm = {
  rfc: '', name: '', email: '', postalCode: '', regimenFiscal: '616', usoCfdi: 'G03',
}

interface PaymentModalProps {
  onSuccess: (orderResponse?: OrderResponse) => void
  onClose: () => void
  editMode?: boolean
  amountToCharge?: number
}

export function PaymentModal({ onSuccess, onClose, editMode, amountToCharge }: PaymentModalProps) {
  const { items, totalAmount, discountAmount, discount, orderId, customerName, clearCart } = useCartStore()
  const { user, shiftId, branchId } = useAuthStore()
  const displayAmount = editMode && amountToCharge !== undefined ? amountToCharge : totalAmount
  const { isOnline } = useNetworkStore()
  const [step, setStep] = useState<Step>('select')
  const [terminalIntentId, setTerminalIntentId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  // Print state
  interface PrintData {
    items: typeof items
    totalAmount: number
    discountAmount: number
    customerName: string
    orderNumber?: string
    paidAt: string
  }
  const [printData, setPrintData] = useState<PrintData | null>(null)

  // Invoice state
  const [completedOrderResponse, setCompletedOrderResponse] = useState<OrderResponse | null>(null)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(EMPTY_INVOICE)
  const [invoicing, setInvoicing] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const [issuedFolio, setIssuedFolio] = useState('')

  function afterPayment(orderResponse?: OrderResponse) {
    // Capture receipt data BEFORE clearing cart
    setPrintData({
      items: items.map(i => ({ ...i })),
      totalAmount,
      discountAmount,
      customerName,
      orderNumber: orderResponse?.orderNumber ? String(orderResponse.orderNumber) : undefined,
      paidAt: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
    })
    clearCart()
    setCompletedOrderResponse(orderResponse ?? null)
    setStep('invoice-ask')
  }

  function handlePrint() {
    window.print()
  }

  async function handleInvoice() {
    if (!invoiceForm.rfc || !invoiceForm.name || !invoiceForm.email || !invoiceForm.postalCode) {
      setInvoiceError('Completa RFC, razón social, correo y CP')
      return
    }
    setInvoicing(true)
    setInvoiceError('')
    try {
      const body = {
        branchId: branchId ?? '',
        orderId: completedOrderResponse?.id ?? null,
        sessionId: null,
        customer: {
          rfc: invoiceForm.rfc.toUpperCase().trim(),
          name: invoiceForm.name.trim(),
          email: invoiceForm.email.trim(),
          domicilioFiscalReceptor: invoiceForm.postalCode.trim(),
          regimenFiscalReceptor: invoiceForm.regimenFiscal,
          usoCfdi: invoiceForm.usoCfdi,
        },
      }
      const res = await api.post<{ data: { folio: string } }>('/api/v1/invoices', body)
      setIssuedFolio(res.data.folio)
      setStep('invoice-done')
    } catch (err) {
      if (import.meta.env.DEV) {
        setIssuedFolio('A-000001')
        setStep('invoice-done')
      } else {
        setInvoiceError(err instanceof ApiError ? err.message : 'Error al timbrar. Intenta de nuevo.')
      }
    } finally {
      setInvoicing(false)
    }
  }

  function buildOrder(method: PaymentMethod): CreateOrderDto {
    return {
      id: orderId,
      branchId: branchId ?? '',
      employeeId: user?.id ?? '',
      shiftId: shiftId ?? uuidv4(),
      paymentMethod: method,
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        modifiers: i.modifiers.map((m: CartItemModifier) => ({ optionId: m.optionId, priceDelta: m.priceDelta })),
        note: i.note,
      })),
      totalAmount,
      discountAmount: discountAmount || undefined,
      discountReason: discount?.reason,
      source: OrderSource.POS,
      createdAt: new Date().toISOString(),
    }
  }

  async function handleQRConfirm() {
    if (!user) return
    setLoading(true)
    try {
      if (editMode) {
        // Edit mode: don't create a new order, POSMain will call PUT /api/v1/orders/:id
        afterPayment()
      } else if (isOnline) {
        const order = buildOrder(PaymentMethod.QR)
        const res = await api.post<ApiResponse<OrderResponse>>('/api/v1/orders', order)
        afterPayment(res.data)
      } else {
        const order = buildOrder(PaymentMethod.QR)
        const { db } = await import('@/shared/lib/db')
        await db.pendingOrders.add({ localId: orderId, branchId: branchId ?? '', data: order, createdAt: order.createdAt!, synced: false })
        afterPayment()
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleTerminalSelect() {
    if (!isOnline) { setNotice('Terminal requiere conexión a internet'); return }
    setNotice('')
    if (!user) return
    setLoading(true)
    try {
      let intentOrderId: string
      if (editMode) {
        // Edit mode: use the existing orderId for the terminal intent (no new order)
        intentOrderId = orderId
      } else {
        const order = buildOrder(PaymentMethod.CARD_TERMINAL)
        const orderRes = await api.post<ApiResponse<OrderResponse>>('/api/v1/orders', order)
        intentOrderId = orderRes.data.id
      }
      const intentRes = await api.post<TerminalIntentResponse>('/api/v1/payments/terminal-intent', {
        amount: displayAmount,
        orderId: intentOrderId,
        description: editMode ? 'Cargo adicional por edición' : 'Pago en POS',
      })
      setTerminalIntentId(intentRes.intentId)
      setStep('terminal')
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Error al iniciar el terminal')
    }
    setLoading(false)
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={step === 'select' ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-sm bg-[var(--color-surface)] rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text-primary)]">
            {step === 'select' ? 'Método de pago'
              : step === 'cash' ? 'Cobro en efectivo'
              : step === 'terminal' ? 'Terminal'
              : step === 'invoice-ask' ? 'Pago completado'
              : step === 'invoice-form' ? 'Datos de facturación'
              : step === 'invoice-done' ? 'Factura emitida'
              : 'QR / Transferencia'}
          </h2>
          {step !== 'terminal' && step !== 'invoice-ask' && step !== 'invoice-form' && step !== 'invoice-done' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="cerrar modal de pago"
              className="text-[var(--color-text-muted)] text-xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* select step */}
        {step === 'select' && (
          <div className="p-4 space-y-3">
            <p className="text-center text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(displayAmount)}</p>
            {notice && <p className="text-sm text-[var(--color-danger)] text-center">{notice}</p>}
            {[
              { label: 'Efectivo', icon: '💵', action: () => setStep('cash') },
              { label: 'Tarjeta (Terminal)', icon: '💳', action: handleTerminalSelect },
              { label: 'QR / Transferencia', icon: '📱', action: () => setStep('qr') },
            ].map(({ label, icon, action }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors"
              >
                <span className="text-xl">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}

        {step === 'cash' && (
          <CashFlow
            onSuccess={(r) => afterPayment(r)}
            onCancel={() => setStep('select')}
            editMode={editMode}
            amountToCharge={amountToCharge}
          />
        )}

        {step === 'qr' && (
          <div className="p-4 space-y-4">
            <p className="text-center text-sm text-[var(--color-text-secondary)]">
              Solicita al cliente que realice la transferencia o escanée el QR.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('select')} className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-sm">
                Volver
              </button>
              <button
                type="button"
                onClick={handleQRConfirm}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-40"
              >
                {loading ? '…' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        )}

        {step === 'terminal' && terminalIntentId && (
          <TerminalWaiting
            intentId={terminalIntentId}
            amount={displayAmount}
            onSuccess={() => afterPayment(completedOrderResponse ?? undefined)}
            onError={(status) => {
              setNotice(status === PaymentStatus.DECLINED ? 'Pago rechazado' : 'Pago cancelado')
              setStep('select')
            }}
            onTimeout={() => { setNotice('Sin respuesta del terminal — intenta de nuevo'); setStep('select') }}
            onCancel={() => setStep('select')}
          />
        )}

        {/* ── ¿Factura? ── */}
        {step === 'invoice-ask' && (
          <div className="p-5 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-4xl">✅</div>
              <p className="font-bold text-[var(--color-text-primary)] text-lg">Pago recibido</p>
              {completedOrderResponse && (
                <p className="text-xs text-[var(--color-text-muted)]">Orden #{completedOrderResponse.orderNumber}</p>
              )}
            </div>
            <p className="text-center text-sm text-[var(--color-text-secondary)]">¿El cliente necesita factura?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onSuccess(completedOrderResponse ?? undefined)}
                className="py-4 rounded-2xl border-2 border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors"
              >
                No, gracias
              </button>
              <button
                type="button"
                onClick={() => setStep('invoice-form')}
                disabled={!isOnline && !completedOrderResponse}
                className="py-4 rounded-2xl bg-[var(--color-accent)] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Sí, facturar
              </button>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              <Printer size={15} strokeWidth={2} />
              Imprimir ticket
            </button>
            {!isOnline && (
              <p className="text-xs text-center text-[var(--color-text-muted)]">
                Modo sin conexión — la factura se podrá emitir desde el Dashboard cuando haya internet.
              </p>
            )}
          </div>
        )}

        {/* ── Formulario de factura ── */}
        {step === 'invoice-form' && (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="space-y-2.5">
              {/* RFC */}
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">RFC *</label>
                <input
                  type="text"
                  value={invoiceForm.rfc}
                  onChange={e => setInvoiceForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                  placeholder="XAXX010101000"
                  maxLength={13}
                  autoCapitalize="characters"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] tracking-widest font-mono"
                />
              </div>

              {/* Razón social */}
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">Razón social *</label>
                <input
                  type="text"
                  value={invoiceForm.name}
                  onChange={e => setInvoiceForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre o empresa"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* Correo + CP en grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">Correo *</label>
                  <input
                    type="email"
                    value={invoiceForm.email}
                    onChange={e => setInvoiceForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@ejemplo.mx"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">CP fiscal *</label>
                  <input
                    type="text"
                    value={invoiceForm.postalCode}
                    onChange={e => setInvoiceForm(f => ({ ...f, postalCode: e.target.value.replace(/\D/g, '') }))}
                    placeholder="06600"
                    maxLength={5}
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>

              {/* Régimen fiscal */}
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">Régimen fiscal</label>
                <select
                  value={invoiceForm.regimenFiscal}
                  onChange={e => setInvoiceForm(f => ({ ...f, regimenFiscal: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {REGIMEN_FISCAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Uso CFDI */}
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">Uso CFDI</label>
                <select
                  value={invoiceForm.usoCfdi}
                  onChange={e => setInvoiceForm(f => ({ ...f, usoCfdi: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {USO_CFDI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {invoiceError && <p className="text-sm text-[var(--color-danger)] text-center">{invoiceError}</p>}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('invoice-ask')}
                className="py-3 rounded-2xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleInvoice}
                disabled={invoicing}
                className="py-3 rounded-2xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-40"
              >
                {invoicing ? 'Timbrando…' : 'Timbrar factura'}
              </button>
            </div>
          </div>
        )}

        {/* ── Factura emitida ── */}
        {step === 'invoice-done' && (
          <div className="p-6 space-y-5 text-center">
            <div className="space-y-2">
              <div className="text-5xl">🧾</div>
              <p className="font-bold text-[var(--color-text-primary)] text-lg">Factura timbrada</p>
              {issuedFolio && (
                <p className="text-sm text-[var(--color-text-muted)]">Folio <span className="font-mono font-semibold text-[var(--color-text-primary)]">{issuedFolio}</span></p>
              )}
              <p className="text-sm text-[var(--color-text-secondary)]">
                El PDF se enviará al correo <span className="font-semibold">{invoiceForm.email}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
              >
                <Printer size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => onSuccess(completedOrderResponse ?? undefined)}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-accent)] text-white font-bold text-sm"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── Receipt for printing ── */}
    {printData && (
      <div id="copo-receipt">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>COPO POS</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>{printData.paidAt}</div>
          {printData.orderNumber && (
            <div style={{ fontSize: 11, marginTop: 1 }}>Orden #{printData.orderNumber}</div>
          )}
        </div>

        {printData.customerName && (
          <div style={{ marginBottom: 8 }}>
            <strong>PARA:</strong> {printData.customerName}
          </div>
        )}

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {printData.items.map(item => {
          const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceDelta, 0)
          const lineTotal = (item.unitPrice + modTotal) * item.quantity
          return (
            <div key={item.localId} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.quantity}x {item.productName}</span>
                <span>{formatCurrency(lineTotal)}</span>
              </div>
              {(item.modifiers ?? []).map(m => (
                <div key={m.optionId} style={{ fontSize: 10, paddingLeft: 12, color: '#555' }}>
                  + {m.optionName}
                </div>
              ))}
              {item.note && (
                <div style={{ fontSize: 10, paddingLeft: 12, fontStyle: 'italic', color: '#555' }}>
                  Nota: {item.note}
                </div>
              )}
            </div>
          )
        })}

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {printData.discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span>Descuento</span>
            <span>-{formatCurrency(printData.discountAmount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, marginTop: 4 }}>
          <span>TOTAL</span>
          <span>{formatCurrency(printData.totalAmount)}</span>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '12px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 11 }}>¡Gracias por su visita!</div>
      </div>
    )}
    </>
  )
}
