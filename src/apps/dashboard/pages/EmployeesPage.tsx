import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'
import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'

const HAS_COMANDERO = true

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  branchId?: string
  name: string
  username?: string
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
  branches?: EmployeeBranchEntry[]
}

interface EmployeeBranchEntry {
  id: string
  name: string
  role: EmployeeRole
  isPrimary: boolean
}

interface BranchAccessForm {
  branchId: string
  role: EmployeeRole
}

interface EmployeeForm {
  name: string
  username: string
  email: string
  role: EmployeeRole
  password: string
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
  branchAccess: BranchAccessForm[]
}

type PermKey = keyof Omit<EmployeeForm, 'name' | 'username' | 'email' | 'role' | 'password' | 'hasPin' | 'branchAccess'>

function deriveUsername(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
}

// ── Role defaults ─────────────────────────────────────────────────────────────

const ROLE_DEFAULTS: Record<EmployeeRole, Omit<EmployeeForm, 'name' | 'username' | 'email' | 'role' | 'password' | 'hasPin' | 'branchAccess'>> = {
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
  username: '',
  email: '',
  role,
  password: '',
  hasPin: false,
  branchAccess: [],
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
      { key: 'isShared',            label: 'Perfil compartido',      hint: 'Una contraseña que comparten varias personas en la misma terminal', sensitive: true },
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

/** Settings that are "sensitive" and require admin password confirmation */
function isSensitive(form: EmployeeForm, original: Employee | null): boolean {
  if (form.password) return true
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
              Contraseña admin
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
          <h3 className="font-bold text-[var(--color-text-primary)] mt-2">Confirmar con contraseña</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Ingresa tu contraseña de administrador para aplicar los cambios marcados
          </p>
        </div>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="w-full px-3 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        {error && <p className="text-xs text-[var(--color-danger)] text-center mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(pin)}
            disabled={!pin.trim()}
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
  const allBranches = useBranchStore(s => s.branches)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [editEmployee, setEditEmployee] = useState<Employee | null | 'new'>(null)
  const [form, setForm]           = useState<EmployeeForm>(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [loadingBranchAccess, setLoadingBranchAccess] = useState(false)

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

  async function openEdit(emp: Employee) {
    setForm({
      name: emp.name,
      username: emp.username ?? deriveUsername(emp.name),
      email: (emp as any).email ?? '',
      role: emp.role,
      password: '',
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
      branchAccess: [],
    })
    setEditEmployee(emp)
    setError('')

    // Fetch current branch access for this employee
    setLoadingBranchAccess(true)
    try {
      const res = await api.get<{ data: EmployeeBranchEntry[] }>(`/api/v1/employees/${emp.id}/branches`)
      const additional = res.data.filter(b => !b.isPrimary)
      setForm(f => ({ ...f, branchAccess: additional.map(b => ({ branchId: b.id, role: b.role })) }))
    } catch {
      // Not critical — leave branchAccess empty
    } finally {
      setLoadingBranchAccess(false)
    }
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

  async function syncBranchAccess(employeeId: string, desiredAccess: BranchAccessForm[], originalAccess: BranchAccessForm[]) {
    const originalIds = new Set(originalAccess.map(a => a.branchId))
    const desiredIds = new Set(desiredAccess.map(a => a.branchId))

    const toAdd = desiredAccess.filter(a => !originalIds.has(a.branchId))
    const toRemove = originalAccess.filter(a => !desiredIds.has(a.branchId))

    await Promise.all([
      ...toAdd.map(a =>
        api.post(`/api/v1/employees/${employeeId}/branches`, { targetBranchId: a.branchId, role: a.role })
      ),
      ...toRemove.map(a =>
        api.delete(`/api/v1/employees/${employeeId}/branches/${a.branchId}`)
      ),
    ])
  }

  async function persistSave() {
    setSaving(true)
    setError('')

    // Solo enviar username si el usuario lo cambió explícitamente
    const originalUsername = editEmployee !== 'new'
      ? ((editEmployee as Employee).username ?? deriveUsername((editEmployee as Employee).name))
      : null
    const newUsername = form.username || deriveUsername(form.name)
    const usernameChanged = newUsername !== originalUsername

    const payload = {
      name: form.name,
      username: (editEmployee === 'new' || usernameChanged) ? newUsername : undefined,
      email: form.email || undefined,
      role: form.role,
      password: form.password || undefined,
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
        const newEmployee = res.data
        if (form.branchAccess.length > 0) {
          await syncBranchAccess(newEmployee.id, form.branchAccess, [])
        }
        setEmployees(prev => [...prev, { ...newEmployee, branches: form.branchAccess.map(a => ({ id: a.branchId, name: allBranches.find(b => b.id === a.branchId)?.name ?? a.branchId, role: a.role, isPrimary: false })) }])
      } else if (editEmployee) {
        const emp = editEmployee as Employee
        const res = await api.put<{ data: Employee }>(`/api/v1/employees/${emp.id}`, payload)
        const originalAccess = (emp.branches ?? []).filter(b => !b.isPrimary).map(b => ({ branchId: b.id, role: b.role }))
        await syncBranchAccess(emp.id, form.branchAccess, originalAccess)
        setEmployees(prev => prev.map(e => {
          if (e.id === emp.id) {
            const hasPinBefore = e.hasPin || (e as any).has_pin || (e as any).hasPassword
            const updated = { ...e, ...res.data }
            updated.hasPin = !!(form.password || hasPinBefore || updated.hasPin || (updated as any).has_pin)
            updated.branches = [
              { id: branchId ?? '', name: allBranches.find(b => b.id === branchId)?.name ?? '', role: form.role, isPrimary: true },
              ...form.branchAccess.map(a => ({ id: a.branchId, name: allBranches.find(b => b.id === a.branchId)?.name ?? a.branchId, role: a.role, isPrimary: false })),
            ]
            return updated
          }
          return e
        }))
      }
      closeModal()
    } catch (err) {
      if (import.meta.env.DEV) {
        const id = editEmployee === 'new' ? crypto.randomUUID() : (editEmployee as Employee).id
        const saved: Employee = { id, ...payload, active: true, hasPin: !!(form.password || form.hasPin) } as Employee
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

  function handlePinConfirm(password: string) {
    if (import.meta.env.DEV) {
      setShowPinModal(false)
      void persistSave()
      return
    }
    api.post('/api/v1/auth/verify-admin-password', { password })
      .then(() => { setShowPinModal(false); void persistSave() })
      .catch(() => setPinError('Contraseña incorrecta'))
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
              {['Nombre', 'Rol', 'Sucursales', 'Contraseña', 'Estado', ''].map(h => (
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
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const branchList: EmployeeBranchEntry[] = emp.branches && emp.branches.length > 0
                        ? emp.branches
                        : emp.branchId
                          ? [{ id: emp.branchId, name: allBranches.find(b => b.id === emp.branchId)?.name ?? emp.branchId, role: emp.role, isPrimary: true }]
                          : []
                      return branchList.length > 0 ? branchList.map(b => (
                        <span
                          key={b.id}
                          className={[
                            'text-[10px] px-2 py-0.5 rounded-full font-medium',
                            b.isPrimary
                              ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                              : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]',
                          ].join(' ')}
                        >
                          {b.name}
                        </span>
                      )) : <span className="text-[10px] text-[var(--color-text-muted)]">—</span>
                    })()}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const hasPin = emp.hasPin || (emp as any).has_pin || (emp as any).hasPassword;
                    return (
                      <span className={['px-2 py-0.5 rounded-full text-xs font-semibold', hasPin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'].join(' ')}>
                        {hasPin ? 'Configurado' : 'Sin contraseña'}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  <span className={['px-2 py-0.5 rounded-full text-xs font-semibold', emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'].join(' ')}>
                    {emp.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEdit(emp)}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Editar
                    </button>
                    {emp.role !== EmployeeRole.OWNER && (
                      <button
                        type="button"
                        onClick={() => { setDeleteTarget(emp); setDeleteError('') }}
                        className="text-xs text-[var(--color-danger)] hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
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

            {(() => {
              const isOwner = editEmployee !== 'new' && editEmployee !== null && (editEmployee as Employee).role === EmployeeRole.OWNER
              return (
                <div className="space-y-3">
                  {/* Name */}
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                  />

                  {/* Role — oculto para OWNER */}
                  {!isOwner && (
                    <select
                      value={form.role}
                      onChange={e => handleRoleChange(e.target.value as EmployeeRole)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                    >
                      {rolesForPlan.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  )}

                  {/* Username */}
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    onFocus={() => {
                      if (!form.username && form.name) setForm(f => ({ ...f, username: deriveUsername(form.name) }))
                    }}
                    placeholder="Usuario para login (ej: juan.perez)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] font-mono"
                  />

                  {/* Contraseña */}
                  <div className="relative">
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Contraseña (vacío = no cambiar)"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                    />
                    {form.hasPin && !form.password && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                        <span className="text-[10px] font-semibold text-green-600">Guardado</span>
                      </div>
                    )}
                  </div>

                  {/* Correo — solo para OWNER */}
                  {isOwner && (
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="Correo electrónico"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                    />
                  )}
                </div>
              )
            })()}

            {/* Branch access — oculto para OWNER */}
            {allBranches.length >= 1 && !(editEmployee !== 'new' && editEmployee !== null && (editEmployee as Employee).role === EmployeeRole.OWNER) && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                  Acceso a sucursales
                </p>
                {loadingBranchAccess ? (
                  <p className="text-xs text-[var(--color-text-muted)]">Cargando…</p>
                ) : (
                  <div className="space-y-2">
                    {allBranches.map(branch => {
                      const isCurrent = branch.id === branchId
                      const accessEntry = form.branchAccess.find(a => a.branchId === branch.id)
                      const isChecked = isCurrent || !!accessEntry

                      function toggleBranch(checked: boolean) {
                        setForm(f => ({
                          ...f,
                          branchAccess: checked
                            ? [...f.branchAccess, { branchId: branch.id, role: EmployeeRole.CASHIER }]
                            : f.branchAccess.filter(a => a.branchId !== branch.id),
                        }))
                      }

                      function changeRole(role: EmployeeRole) {
                        setForm(f => ({
                          ...f,
                          branchAccess: f.branchAccess.map(a =>
                            a.branchId === branch.id ? { ...a, role } : a
                          ),
                        }))
                      }

                      return (
                        <div key={branch.id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`branch-${branch.id}`}
                            checked={isChecked}
                            disabled={isCurrent}
                            onChange={e => toggleBranch(e.target.checked)}
                            className="w-4 h-4 accent-[var(--color-accent)]"
                          />
                          <label
                            htmlFor={`branch-${branch.id}`}
                            className={['flex-1 text-sm', isCurrent ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)] cursor-pointer'].join(' ')}
                          >
                            {branch.name}
                            {isCurrent && <span className="ml-1.5 text-[10px] text-[var(--color-accent)]">(actual)</span>}
                          </label>
                          {isChecked && !isCurrent && (
                            <select
                              value={accessEntry?.role ?? EmployeeRole.CASHIER}
                              onChange={e => changeRole(e.target.value as EmployeeRole)}
                              className="text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                            >
                              {rolesForPlan.map(r => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Permission groups — ocultos para OWNER */}
            {(editEmployee === 'new' || (editEmployee as Employee)?.role !== EmployeeRole.OWNER) && (
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
            )}

            {/* Sensitive notice */}
            {isSensitive(form, originalForSensitive) && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                🔐 Se pedirá tu contraseña de administrador para confirmar los cambios marcados.
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
