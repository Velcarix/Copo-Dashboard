import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'
import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'

// DEV mock — in production from auth JWT / settings
// Only affects whether WAITER role (comandero tablet) is assignable
const HAS_COMANDERO = true

interface Employee {
  id: string
  name: string
  username?: string
  role: EmployeeRole
  active: boolean
  hasPin: boolean
  isShared: boolean
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
  username: string
  email: string
  role: EmployeeRole
  password: string
  hasPin: boolean
  isShared: boolean
  canSkipShiftOpen: boolean
  canSkipShiftClose: boolean
  branchAccess: BranchAccessForm[]
}

function deriveUsername(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
}

const emptyForm = (): EmployeeForm => ({
  name: '',
  username: '',
  email: '',
  role: EmployeeRole.CASHIER,
  password: '',
  hasPin: false,
  isShared: false,
  canSkipShiftOpen: false,
  canSkipShiftClose: false,
  branchAccess: [],
})

/** Settings that are "sensitive" and require admin password confirmation */
function isSensitive(form: EmployeeForm, original: Employee | null): boolean {
  if (form.password) return true
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
              Contraseña admin
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
          <h3 className="font-bold text-[var(--color-text-primary)] mt-2">Confirmar con contraseña</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Ingresa tu contraseña de administrador para aplicar esta configuración
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

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinError, setPinError]         = useState('')

  // Delete state
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
    const payload = {
      name: form.name,
      username: form.username || deriveUsername(form.name),
      email: form.email || undefined,
      role: form.role,
      password: form.password || undefined,
      branchId: branchId ?? '',
      isShared: form.isShared,
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
        const saved: Employee = {
          id,
          name: form.name,
          role: form.role,
          active: true,
          hasPin: form.password ? true : form.hasPin,
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
    api.post('/api/v1/auth/verify-admin-password', { password })
      .then(() => { setShowPinModal(false); persistSave() })
      .catch(() => setPinError('Contraseña incorrecta'))
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
                    {emp.branches && emp.branches.length > 0 ? (
                      emp.branches.map(b => (
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
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--color-text-muted)]">—</span>
                    )}
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
                      onChange={e => setForm(f => ({ ...f, role: e.target.value as EmployeeRole }))}
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

            {/* Permission toggles — ocultos para OWNER */}
            {(editEmployee === 'new' || (editEmployee as Employee)?.role !== EmployeeRole.OWNER) && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Configuración del perfil
                </p>

                <ToggleRow
                  label="Perfil compartido"
                  hint="Una contraseña que comparten varias personas en la misma terminal"
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
            )

            {/* Sensitive settings notice */}
            {isSensitive(form, editEmployee !== 'new' && editEmployee ? editEmployee : null) && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
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
