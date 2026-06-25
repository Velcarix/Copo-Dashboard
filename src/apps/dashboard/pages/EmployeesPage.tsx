import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'
import { useAuthStore } from '@/shared/store/authStore'

const HAS_COMANDERO = true

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  name: string
  role: EmployeeRole
  active: boolean
  hasPin: boolean
  isShared: boolean
  canAccessPOS: boolean
  canAccessComandero: boolean
  canAccessKitchen: boolean
  canAccessDashboard: boolean
  canManageTables: boolean
  canAddTables: boolean
  canApplyDiscounts: boolean
  canCancelOrders: boolean
  canViewReports: boolean
  canManageInventory: boolean
  canManageEmployees: boolean
  canManageProducts: boolean
  canIssueInvoices: boolean
  canSkipShiftOpen: boolean
  canSkipShiftClose: boolean
}

interface EmployeeForm {
  name: string
  role: EmployeeRole
  pin: string
  hasPin: boolean
  isShared: boolean
  canAccessPOS: boolean
  canAccessComandero: boolean
  canAccessKitchen: boolean
  canAccessDashboard: boolean
  canManageTables: boolean
  canAddTables: boolean
  canApplyDiscounts: boolean
  canCancelOrders: boolean
  canViewReports: boolean
  canManageInventory: boolean
  canManageEmployees: boolean
  canManageProducts: boolean
  canIssueInvoices: boolean
  canSkipShiftOpen: boolean
  canSkipShiftClose: boolean
}

type PermKey = keyof Omit<EmployeeForm, 'name' | 'role' | 'pin' | 'hasPin'>

// ── Role defaults ─────────────────────────────────────────────────────────────

const ROLE_DEFAULTS: Record<EmployeeRole, Omit<EmployeeForm, 'name' | 'role' | 'pin' | 'hasPin'>> = {
  [EmployeeRole.CASHIER]: {
    isShared: false,
    canAccessPOS: true,   canAccessComandero: false, canAccessKitchen: false, canAccessDashboard: false,
    canManageTables: false, canAddTables: false,      canApplyDiscounts: false, canCancelOrders: false,
    canViewReports: false, canManageInventory: false, canManageEmployees: false, canManageProducts: false,
    canIssueInvoices: false, canSkipShiftOpen: false, canSkipShiftClose: false,
  },
  [EmployeeRole.WAITER]: {
    isShared: false,
    canAccessPOS: true,   canAccessComandero: true,  canAccessKitchen: false, canAccessDashboard: false,
    canManageTables: true,  canAddTables: false,     canApplyDiscounts: false, canCancelOrders: false,
    canViewReports: false, canManageInventory: false, canManageEmployees: false, canManageProducts: false,
    canIssueInvoices: false, canSkipShiftOpen: true,  canSkipShiftClose: true,
  },
  [EmployeeRole.KITCHEN]: {
    isShared: false,
    canAccessPOS: false,  canAccessComandero: false, canAccessKitchen: true,  canAccessDashboard: false,
    canManageTables: false, canAddTables: false,     canApplyDiscounts: false, canCancelOrders: false,
    canViewReports: false, canManageInventory: false, canManageEmployees: false, canManageProducts: false,
    canIssueInvoices: false, canSkipShiftOpen: true,  canSkipShiftClose: true,
  },
  [EmployeeRole.ADMIN]: {
    isShared: false,
    canAccessPOS: true,   canAccessComandero: true,  canAccessKitchen: true,  canAccessDashboard: true,
    canManageTables: true,  canAddTables: true,      canApplyDiscounts: true,  canCancelOrders: true,
    canViewReports: true,  canManageInventory: true,  canManageEmployees: true,  canManageProducts: true,
    canIssueInvoices: true,  canSkipShiftOpen: true,  canSkipShiftClose: true,
  },
  [EmployeeRole.OWNER]: {
    isShared: false,
    canAccessPOS: true,   canAccessComandero: true,  canAccessKitchen: true,  canAccessDashboard: true,
    canManageTables: true,  canAddTables: true,      canApplyDiscounts: true,  canCancelOrders: true,
    canViewReports: true,  canManageInventory: true,  canManageEmployees: true,  canManageProducts: true,
    canIssueInvoices: true,  canSkipShiftOpen: true,  canSkipShiftClose: true,
  },
}

const emptyForm = (role: EmployeeRole = EmployeeRole.CASHIER): EmployeeForm => ({
  name: '',
  role,
  pin: '',
  hasPin: false,
  ...ROLE_DEFAULTS[role],
})

// ── Permission groups ─────────────────────────────────────────────────────────

interface PermGroup {
  label: string
  perms: { key: PermKey; label: string; hint: string; sensitive?: boolean }[]
}

const PERM_GROUPS: PermGroup[] = [
  {
    label: 'Acceso a módulos',
    perms: [
      { key: 'canAccessPOS',        label: 'POS (mostrador)',        hint: 'Puede usar la pantalla de ventas en mostrador' },
      { key: 'canAccessComandero',  label: 'Comandero (mesas)',      hint: 'Puede tomar órdenes en las mesas' },
      { key: 'canAccessKitchen',    label: 'Pantalla de cocina',     hint: 'Puede ver y actualizar órdenes en cocina' },
      { key: 'canAccessDashboard',  label: 'Panel de administración', hint: 'Puede entrar al panel de configuración', sensitive: true },
    ],
  },
  {
    label: 'Ventas',
    perms: [
      { key: 'canApplyDiscounts',   label: 'Aplicar descuentos',     hint: 'Puede reducir el precio de productos o totales' },
      { key: 'canCancelOrders',     label: 'Cancelar órdenes',       hint: 'Puede cancelar una orden ya creada' },
      { key: 'canIssueInvoices',    label: 'Emitir facturas (CFDI)', hint: 'Puede solicitar factura fiscal al cliente' },
    ],
  },
  {
    label: 'Turnos',
    perms: [
      { key: 'canSkipShiftOpen',    label: 'Saltarse apertura de turno', hint: 'Entra directo al POS sin declarar fondo inicial', sensitive: true },
      { key: 'canSkipShiftClose',   label: 'Saltarse cierre de turno',   hint: 'Sale del POS sin cerrar ni contar efectivo', sensitive: true },
    ],
  },
  {
    label: 'Gestión',
    perms: [
      { key: 'canManageProducts',   label: 'Gestionar productos',    hint: 'Puede agregar, editar y desactivar productos', sensitive: true },
      { key: 'canManageTables',     label: 'Gestionar mesas',        hint: 'Puede mover y editar mesas existentes' },
      { key: 'canAddTables',        label: 'Agregar nuevas mesas',   hint: 'Puede crear mesas adicionales en el plano', sensitive: true },
      { key: 'canManageInventory',  label: 'Gestionar inventario',   hint: 'Puede ajustar stock e ingresar merma', sensitive: true },
      { key: 'canManageEmployees',  label: 'Gestionar empleados',    hint: 'Puede crear, editar y desactivar perfiles', sensitive: true },
      { key: 'canViewReports',      label: 'Ver reportes',           hint: 'Puede acceder a reportes de ventas y turnos' },
    ],
  },
  {
    label: 'Terminal',
    perms: [
      { key: 'isShared',            label: 'Perfil compartido',      hint: 'Un PIN que comparten varias personas en la misma terminal', sensitive: true },
    ],
  },
]

const ROLE_LABELS: Record<EmployeeRole, string> = {
  [EmployeeRole.OWNER]:   'Dueño',
  [EmployeeRole.ADMIN]:   'Admin',
  [EmployeeRole.WAITER]:  'Mesero',
  [EmployeeRole.KITCHEN]: 'Cocina',
  [EmployeeRole.CASHIER]: 'Cajero',
}

const ASSIGNABLE_ROLES = Object.values(EmployeeRole).filter(r => r !== EmployeeRole.OWNER)

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'e1', name: 'Roberto García', role: EmployeeRole.OWNER, active: true, hasPin: false,
    ...ROLE_DEFAULTS[EmployeeRole.OWNER],
  },
  {
    id: 'e2', name: 'María López', role: EmployeeRole.CASHIER, active: true, hasPin: true,
    ...ROLE_DEFAULTS[EmployeeRole.CASHIER],
  },
  {
    id: 'e3', name: 'Carlos Pérez', role: EmployeeRole.CASHIER, active: true, hasPin: true,
    ...ROLE_DEFAULTS[EmployeeRole.CASHIER],
  },
]

// ── isSensitive ───────────────────────────────────────────────────────────────

function isSensitive(form: EmployeeForm, original: Employee | null): boolean {
  if (form.role === EmployeeRole.ADMIN) return true
  const sensitiveKeys: PermKey[] = [
    'isShared', 'canSkipShiftOpen', 'canSkipShiftClose',
    'canAccessDashboard', 'canManageProducts', 'canAddTables',
    'canManageInventory', 'canManageEmployees',
  ]
  return sensitiveKeys.some(k => form[k] && !original?.[k])
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  sensitive?: boolean
}

function ToggleRow({ label, hint, checked, onChange, sensitive }: ToggleRowProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
          {sensitive && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              PIN admin
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{hint}</p>
      </div>
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
            Ingresa tu PIN de administrador para aplicar los cambios marcados
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

  const [showPinModal, setShowPinModal] = useState(false)
  const [pinError, setPinError]         = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState('')

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

  function handleRoleChange(newRole: EmployeeRole) {
    setForm(f => ({ ...f, role: newRole, ...ROLE_DEFAULTS[newRole] }))
  }

  function togglePerm(key: PermKey) {
    setForm(f => ({ ...f, [key]: !f[key] }))
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
      canAccessPOS: form.canAccessPOS,
      canAccessComandero: form.canAccessComandero,
      canAccessKitchen: form.canAccessKitchen,
      canAccessDashboard: form.canAccessDashboard,
      canManageTables: form.canManageTables,
      canAddTables: form.canAddTables,
      canApplyDiscounts: form.canApplyDiscounts,
      canCancelOrders: form.canCancelOrders,
      canViewReports: form.canViewReports,
      canManageInventory: form.canManageInventory,
      canManageEmployees: form.canManageEmployees,
      canManageProducts: form.canManageProducts,
      canIssueInvoices: form.canIssueInvoices,
      canSkipShiftOpen: form.canSkipShiftOpen,
      canSkipShiftClose: form.canSkipShiftClose,
    }
    try {
      if (editEmployee === 'new') {
        const res = await api.post<{ data: Employee }>('/api/v1/employees', payload)
        setEmployees(prev => [...prev, res.data])
      } else if (editEmployee) {
        const res = await api.put<{ data: Employee }>(`/api/v1/employees/${(editEmployee as Employee).id}`, payload)
        setEmployees(prev => prev.map(e =>
          e.id === (editEmployee as Employee).id
            ? { ...e, ...res.data, hasPin: !!(form.pin || e.hasPin) }
            : e
        ))
      }
      closeModal()
    } catch (err) {
      if (import.meta.env.DEV) {
        const id = editEmployee === 'new' ? crypto.randomUUID() : (editEmployee as Employee).id
        const saved: Employee = { id, ...payload, active: true, hasPin: !!(form.pin || form.hasPin) } as Employee
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
      setShowPinModal(true)
    } else {
      void persistSave()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/api/v1/employees/${deleteTarget.id}`)
      setEmployees(prev => prev.filter(e => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      if (import.meta.env.DEV) {
        setEmployees(prev => prev.filter(e => e.id !== deleteTarget.id))
        setDeleteTarget(null)
      } else {
        setDeleteError(err instanceof ApiError ? err.message : 'Error al eliminar')
      }
    } finally {
      setDeleting(false)
    }
  }

  function handlePinConfirm(pin: string) {
    if (import.meta.env.DEV) {
      setShowPinModal(false)
      void persistSave()
      return
    }
    api.post('/api/v1/auth/verify-admin-pin', { pin })
      .then(() => { setShowPinModal(false); void persistSave() })
      .catch(() => setPinError('PIN incorrecto'))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
      Cargando…
    </div>
  )

  const rolesForPlan = HAS_COMANDERO
    ? ASSIGNABLE_ROLES
    : ASSIGNABLE_ROLES.filter(r => r !== EmployeeRole.WAITER)

  const originalForSensitive = editEmployee !== 'new' && editEmployee ? editEmployee : null

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
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            name: emp.name,
                            role: emp.role,
                            pin: '',
                            hasPin: emp.hasPin,
                            isShared: emp.isShared,
                            canAccessPOS: emp.canAccessPOS,
                            canAccessComandero: emp.canAccessComandero,
                            canAccessKitchen: emp.canAccessKitchen,
                            canAccessDashboard: emp.canAccessDashboard,
                            canManageTables: emp.canManageTables,
                            canAddTables: emp.canAddTables,
                            canApplyDiscounts: emp.canApplyDiscounts,
                            canCancelOrders: emp.canCancelOrders,
                            canViewReports: emp.canViewReports,
                            canManageInventory: emp.canManageInventory,
                            canManageEmployees: emp.canManageEmployees,
                            canManageProducts: emp.canManageProducts,
                            canIssueInvoices: emp.canIssueInvoices,
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
                      <button
                        type="button"
                        onClick={() => { setDeleteTarget(emp); setDeleteError('') }}
                        className="text-xs text-[var(--color-danger)] hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
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

            {/* Basic info */}
            <div className="space-y-3">
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
              />

              <select
                value={form.role}
                onChange={e => handleRoleChange(e.target.value as EmployeeRole)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                {rolesForPlan.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="password"
                  value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="PIN de 4 dígitos (vacío = no cambiar)"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                />
                {form.hasPin && !form.pin && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-semibold text-green-600">Guardado</span>
                  </div>
                )}
              </div>
            </div>

            {/* Permission groups */}
            <div className="mt-5 space-y-5">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Permisos personalizados
              </p>
              <p className="text-xs text-[var(--color-text-muted)] -mt-3">
                Precargados según el rol. Ajusta según necesites.
              </p>

              {PERM_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-3 pl-1">
                    {group.perms.map(perm => (
                      <ToggleRow
                        key={perm.key}
                        label={perm.label}
                        hint={perm.hint}
                        checked={form[perm.key] as boolean}
                        onChange={() => togglePerm(perm.key)}
                        sensitive={perm.sensitive}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sensitive notice */}
            {isSensitive(form, originalForSensitive) && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setDeleteTarget(null); setDeleteError('') }} />
          <div className="relative z-10 w-full max-w-xs bg-[var(--color-surface)] rounded-2xl p-5 shadow-xl text-center">
            <span className="text-3xl">🗑️</span>
            <h3 className="font-bold text-[var(--color-text-primary)] mt-2">Eliminar empleado</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              ¿Eliminar a <strong className="text-[var(--color-text-primary)]">{deleteTarget.name}</strong>?
              <br />Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="text-xs text-[var(--color-danger)] mt-2">{deleteError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteError('') }}
                className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-[var(--color-danger)] text-white text-sm font-bold disabled:opacity-40"
              >
                {deleting ? '…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
