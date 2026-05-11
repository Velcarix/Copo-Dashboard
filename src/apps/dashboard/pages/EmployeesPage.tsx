import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'
import { useAuthStore } from '@/shared/store/authStore'

// DEV mock — in production from auth JWT / settings
// Only affects whether WAITER role (comandero tablet) is assignable
const HAS_COMANDERO = true

interface Employee {
  id: string
  name: string
  role: EmployeeRole
  active: boolean
  hasPin: boolean
  isShared: boolean
  canSkipShiftOpen: boolean
  canSkipShiftClose: boolean
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  [EmployeeRole.OWNER]:   'Dueño',
  [EmployeeRole.ADMIN]:   'Admin',
  [EmployeeRole.WAITER]:  'Mesero',
  [EmployeeRole.KITCHEN]: 'Cocina',
  [EmployeeRole.CASHIER]: 'Cajero',
}

// Roles that the admin can assign (OWNER is set at account creation, never reassigned)
const ASSIGNABLE_ROLES = Object.values(EmployeeRole).filter(r => r !== EmployeeRole.OWNER)

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Roberto García',  role: EmployeeRole.OWNER,   active: true,  hasPin: false, isShared: false, canSkipShiftOpen: true,  canSkipShiftClose: true  },
  { id: 'e2', name: 'María López',     role: EmployeeRole.CASHIER, active: true,  hasPin: true,  isShared: false, canSkipShiftOpen: false, canSkipShiftClose: false },
  { id: 'e3', name: 'Carlos Pérez',    role: EmployeeRole.CASHIER, active: true,  hasPin: true,  isShared: false, canSkipShiftOpen: false, canSkipShiftClose: false },
  { id: 'e4', name: 'Terminal Bar',    role: EmployeeRole.CASHIER, active: true,  hasPin: true,  isShared: true,  canSkipShiftOpen: true,  canSkipShiftClose: false },
]

interface EmployeeForm {
  name: string
  role: EmployeeRole
  pin: string
  isShared: boolean
  canSkipShiftOpen: boolean
  canSkipShiftClose: boolean
}

const emptyForm = (): EmployeeForm => ({
  name: '',
  role: EmployeeRole.CASHIER,
  pin: '',
  isShared: false,
  canSkipShiftOpen: false,
  canSkipShiftClose: false,
})

/** Settings that are "sensitive" and require admin PIN confirmation */
function isSensitive(form: EmployeeForm, original: Employee | null): boolean {
  if (form.role === EmployeeRole.ADMIN) return true
  if (form.isShared && !original?.isShared) return true
  if (form.canSkipShiftOpen && !original?.canSkipShiftOpen) return true
  if (form.canSkipShiftClose && !original?.canSkipShiftClose) return true
  return false
}

// ── Toggle component ──────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  sensitive?: boolean
}

function ToggleRow({ label, hint, checked, onChange, sensitive }: ToggleRowProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
          {sensitive && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              PIN admin
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{hint}</p>
      </div>
      {/* Toggle switch */}
      <div
        className={[
          'relative flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200 mt-0.5',
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
        ].join(' ')}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <div className={[
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-1',
        ].join(' ')} />
      </div>
    </label>
  )
}

// ── PIN confirmation modal ────────────────────────────────────────────────────

interface PinModalProps {
  onConfirm: (pin: string) => void
  onCancel: () => void
  error: string
}

function PinConfirmModal({ onConfirm, onCancel, error }: PinModalProps) {
  const [pin, setPin] = useState('')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-xs bg-[var(--color-surface)] rounded-2xl p-5 shadow-2xl">
        <div className="text-center mb-4">
          <span className="text-3xl">🔐</span>
          <h3 className="font-bold text-[var(--color-text-primary)] mt-2">Confirmar con PIN</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Ingresa tu PIN de administrador para aplicar esta configuración
          </p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          autoFocus
          className="w-full text-center text-2xl tracking-[0.5em] px-3 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        {error && <p className="text-xs text-[var(--color-danger)] text-center mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(pin)}
            disabled={pin.length < 4}
            className="flex-1 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EmployeesPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [editEmployee, setEditEmployee] = useState<Employee | null | 'new'>(null)
  const [form, setForm]           = useState<EmployeeForm>(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinError, setPinError]         = useState('')

  useEffect(() => {
    if (!branchId) { setLoading(false); return }
    api.get<{ data: Employee[] }>(`/api/v1/employees?branchId=${branchId}`)
      .then(res => setEmployees(res.data))
      .catch(() => { if (import.meta.env.DEV) setEmployees(MOCK_EMPLOYEES) })
      .finally(() => setLoading(false))
  }, [branchId])

  function openNew() {
    setForm(emptyForm())
    setEditEmployee('new')
    setError('')
  }

  function closeModal() {
    setEditEmployee(null)
    setShowPinModal(false)
    setPinError('')
  }

  async function persistSave() {
    setSaving(true)
    setError('')
    const payload = {
      name: form.name,
      role: form.role,
      pin: form.pin || undefined,
      branchId: branchId ?? '',
      isShared: form.isShared,
      canSkipShiftOpen: form.canSkipShiftOpen,
      canSkipShiftClose: form.canSkipShiftClose,
    }
    try {
      if (editEmployee === 'new') {
        const res = await api.post<{ data: Employee }>('/api/v1/employees', payload)
        setEmployees(prev => [...prev, res.data])
      } else if (editEmployee) {
        const res = await api.put<{ data: Employee }>(`/api/v1/employees/${(editEmployee as Employee).id}`, payload)
        setEmployees(prev => prev.map(e => e.id === (editEmployee as Employee).id ? res.data : e))
      }
      closeModal()
    } catch (err) {
      if (import.meta.env.DEV) {
        const id = editEmployee === 'new' ? crypto.randomUUID() : (editEmployee as Employee).id
        const saved: Employee = {
          id,
          name: form.name,
          role: form.role,
          active: true,
          hasPin: !!form.pin,
          isShared: form.isShared,
          canSkipShiftOpen: form.canSkipShiftOpen,
          canSkipShiftClose: form.canSkipShiftClose,
        }
        setEmployees(prev =>
          editEmployee === 'new' ? [...prev, saved] : prev.map(e => e.id === id ? saved : e)
        )
        closeModal()
      } else {
        setError(err instanceof ApiError ? err.message : 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  function handleSave() {
    if (!form.name.trim()) return
    const original = editEmployee !== 'new' && editEmployee ? editEmployee : null
    if (isSensitive(form, original)) {
      // Sensitive settings — ask for admin PIN first
      setShowPinModal(true)
    } else {
      persistSave()
    }
  }

  function handlePinConfirm(pin: string) {
    // DEV: bypass PIN check
    if (import.meta.env.DEV) {
      setShowPinModal(false)
      persistSave()
      return
    }
    // PROD: verify admin PIN against backend
    api.post('/api/v1/auth/verify-admin-pin', { pin })
      .then(() => { setShowPinModal(false); persistSave() })
      .catch(() => setPinError('PIN incorrecto'))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
      Cargando…
    </div>
  )

  // WAITER role only makes sense if the business has the comandero plan (waiter tablets)
  // Tables in POS are available to everyone, but the comandero mobile app is plan-gated
  const rolesForPlan = HAS_COMANDERO
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter(r => r !== EmployeeRole.WAITER)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Empleados</h1>
        <button type="button" onClick={openNew}
          className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold">
          + Nuevo
        </button>
      </div>

      {/* Employee table */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {['Nombre', 'Rol', 'PIN', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                  <span>{emp.name}</span>
                  {emp.isShared && (
                    <span className="ml-2 text-[10px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-border)] px-1.5 py-0.5 rounded-full">
                      Compartido
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{ROLE_LABELS[emp.role]}</td>
                <td className="px-4 py-3">
                  <span className={['px-2 py-0.5 rounded-full text-xs font-semibold', emp.hasPin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'].join(' ')}>
                    {emp.hasPin ? 'Configurado' : 'Sin PIN'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={['px-2 py-0.5 rounded-full text-xs font-semibold', emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'].join(' ')}>
                    {emp.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {emp.role !== EmployeeRole.OWNER && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          name: emp.name,
                          role: emp.role,
                          pin: '',
                          isShared: emp.isShared,
                          canSkipShiftOpen: emp.canSkipShiftOpen,
                          canSkipShiftClose: emp.canSkipShiftClose,
                        })
                        setEditEmployee(emp)
                        setError('')
                      }}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / New modal */}
      {editEmployee !== null && !showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm bg-[var(--color-surface)] rounded-2xl p-5 shadow-xl overflow-y-auto max-h-[90dvh]">
            <h2 className="font-bold text-[var(--color-text-primary)] mb-4">
              {editEmployee === 'new' ? 'Nuevo empleado' : 'Editar empleado'}
            </h2>

            <div className="space-y-3">
              {/* Name */}
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
              />

              {/* Role */}
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as EmployeeRole }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                {rolesForPlan.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>

              {/* PIN */}
              <input
                type="password"
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="PIN de 4 dígitos (vacío = no cambiar)"
                inputMode="numeric"
                maxLength={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
              />
            </div>

            {/* Permission toggles */}
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Configuración del perfil
              </p>

              <ToggleRow
                label="Perfil compartido"
                hint="Un PIN que comparten varias personas en la misma terminal"
                checked={form.isShared}
                onChange={v => setForm(f => ({ ...f, isShared: v }))}
                sensitive
              />

              <ToggleRow
                label="Puede saltarse apertura de turno"
                hint="Entra directo al POS sin declarar fondo inicial"
                checked={form.canSkipShiftOpen}
                onChange={v => setForm(f => ({ ...f, canSkipShiftOpen: v }))}
                sensitive
              />

              <ToggleRow
                label="Puede saltarse cierre de turno"
                hint="Sale del POS sin cerrar ni contar efectivo"
                checked={form.canSkipShiftClose}
                onChange={v => setForm(f => ({ ...f, canSkipShiftClose: v }))}
                sensitive
              />
            </div>

            {/* Sensitive settings notice */}
            {isSensitive(form, editEmployee !== 'new' && editEmployee ? editEmployee : null) && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                🔐 Se pedirá tu PIN de administrador para confirmar los cambios marcados.
              </p>
            )}

            {error && <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button type="button" onClick={closeModal}
                className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold disabled:opacity-40"
              >
                {saving ? '…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN confirmation modal */}
      {showPinModal && (
        <PinConfirmModal
          onConfirm={handlePinConfirm}
          onCancel={() => { setShowPinModal(false); setPinError('') }}
          error={pinError}
        />
      )}
    </div>
  )
}
