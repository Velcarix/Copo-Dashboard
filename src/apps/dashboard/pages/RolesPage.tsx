import { useState, useEffect } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { useAuthStore } from '@/shared/store/authStore'
import { EmployeeRole, type ProfilePermissions } from '@shared-types'

// ── Permission metadata ───────────────────────────────────────────────────────

type PermKey = keyof Omit<ProfilePermissions, 'role'>

interface PermMeta {
  key: PermKey
  label: string
  group: string
  /** This permission only makes sense when `dependsOn` is enabled — auto-disabled otherwise. */
  dependsOn?: PermKey
}

const PERMISSIONS: PermMeta[] = [
  // Acceso a módulos
  { key: 'canAccessPOS',        label: 'Acceder al POS',              group: 'Módulos' },
  { key: 'canAccessDashboard',  label: 'Acceder al Dashboard',        group: 'Módulos' },
  { key: 'canAccessComandero',  label: 'Acceder al Comandero',        group: 'Módulos' },
  { key: 'canAccessKitchen',    label: 'Acceder a Cocina',            group: 'Módulos' },
  // Operación en POS — requiere acceso al POS
  { key: 'canApplyDiscounts',   label: 'Aplicar descuentos',          group: 'POS', dependsOn: 'canAccessPOS' },
  { key: 'canCancelOrders',     label: 'Cancelar órdenes',            group: 'POS', dependsOn: 'canAccessPOS' },
  { key: 'canSkipShiftOpen',    label: 'Omitir apertura de turno',    group: 'POS', dependsOn: 'canAccessPOS' },
  { key: 'canSkipShiftClose',   label: 'Omitir cierre de turno',      group: 'POS', dependsOn: 'canAccessPOS' },
  // Comandero — requiere acceso al Comandero
  { key: 'canManageTables',     label: 'Administrar mesas',           group: 'Comandero', dependsOn: 'canAccessComandero' },
  { key: 'canAddTables',        label: 'Agregar mesas en vivo',       group: 'Comandero', dependsOn: 'canAccessComandero' },
  // Administración
  { key: 'canViewReports',      label: 'Ver reportes',                group: 'Administración' },
  { key: 'canManageInventory',  label: 'Gestionar inventario',        group: 'Administración' },
  { key: 'canManageEmployees',  label: 'Gestionar empleados',         group: 'Administración' },
  { key: 'canManageProducts',   label: 'Gestionar productos',         group: 'Administración' },
  { key: 'canIssueInvoices',    label: 'Emitir facturas CFDI',        group: 'Administración' },
]

// Al desactivar una de estas llaves, sus permisos dependientes se desactivan también
// (ej. sin acceso al POS no tiene sentido poder omitir turnos).
const CASCADE_DISABLE: Partial<Record<PermKey, PermKey[]>> = {
  canAccessPOS: ['canApplyDiscounts', 'canCancelOrders', 'canSkipShiftOpen', 'canSkipShiftClose'],
  canAccessComandero: ['canManageTables', 'canAddTables'],
}

const EDITABLE_ROLES: EmployeeRole[] = [
  EmployeeRole.CASHIER,
  EmployeeRole.WAITER,
  EmployeeRole.KITCHEN,
  EmployeeRole.ADMIN,
]

const ROLE_LABEL: Record<EmployeeRole, string> = {
  [EmployeeRole.CASHIER]: 'Cajero',
  [EmployeeRole.WAITER]:  'Mesero',
  [EmployeeRole.KITCHEN]: 'Cocina',
  [EmployeeRole.ADMIN]:   'Admin',
  [EmployeeRole.OWNER]:   'Dueño',
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PROFILES: ProfilePermissions[] = [
  {
    role: EmployeeRole.CASHIER,
    isShared: true,
    canAccessPOS: true,        canAccessDashboard: false,
    canAccessComandero: false, canAccessKitchen: false,
    canManageTables: false,    canAddTables: false,
    canApplyDiscounts: false,  canCancelOrders: false,
    canViewReports: false,     canManageInventory: false,
    canManageEmployees: false, canManageProducts: false,
    canIssueInvoices: false,   canSkipShiftOpen: false,
    canSkipShiftClose: false,
  },
  {
    role: EmployeeRole.WAITER,
    isShared: false,
    canAccessPOS: true,        canAccessDashboard: false,
    canAccessComandero: true,  canAccessKitchen: false,
    canManageTables: true,     canAddTables: false,
    canApplyDiscounts: false,  canCancelOrders: false,
    canViewReports: false,     canManageInventory: false,
    canManageEmployees: false, canManageProducts: false,
    canIssueInvoices: false,   canSkipShiftOpen: false,
    canSkipShiftClose: false,
  },
  {
    role: EmployeeRole.KITCHEN,
    isShared: true,
    canAccessPOS: false,       canAccessDashboard: false,
    canAccessComandero: false, canAccessKitchen: true,
    canManageTables: false,    canAddTables: false,
    canApplyDiscounts: false,  canCancelOrders: false,
    canViewReports: false,     canManageInventory: false,
    canManageEmployees: false, canManageProducts: false,
    canIssueInvoices: false,   canSkipShiftOpen: true,
    canSkipShiftClose: true,
  },
  {
    role: EmployeeRole.ADMIN,
    isShared: false,
    canAccessPOS: true,        canAccessDashboard: true,
    canAccessComandero: true,  canAccessKitchen: true,
    canManageTables: true,     canAddTables: true,
    canApplyDiscounts: true,   canCancelOrders: true,
    canViewReports: true,      canManageInventory: true,
    canManageEmployees: true,  canManageProducts: true,
    canIssueInvoices: true,    canSkipShiftOpen: false,
    canSkipShiftClose: false,
  },
]

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
        checked
          ? 'bg-[var(--color-accent)]'
          : 'bg-[var(--color-border)]',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

// ── RolesPage ─────────────────────────────────────────────────────────────────

type PermMatrix = Record<EmployeeRole, ProfilePermissions>

export function RolesPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [matrix, setMatrix] = useState<PermMatrix | null>(null)
  const [dirty, setDirty] = useState<Set<EmployeeRole>>(new Set())
  const [saving, setSaving] = useState<EmployeeRole | null>(null)
  const [saved, setSaved] = useState<EmployeeRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Group permissions by group label for section headers
  const groups = Array.from(new Set(PERMISSIONS.map(p => p.group)))

  useEffect(() => {
    if (!branchId) return

    function defaultMatrix(): PermMatrix {
      const m = {} as PermMatrix
      for (const p of MOCK_PROFILES) m[p.role] = p
      return m
    }

    api
      .get<{ data: ProfilePermissions[] }>(`/api/v1/profiles?branchId=${branchId}`)
      .then(({ data: profiles }) => {
        const m = defaultMatrix()
        for (const p of profiles) m[p.role] = p
        setMatrix(m)
      })
      .catch(() => {
        setMatrix(defaultMatrix())
      })
  }, [branchId])

  function toggle(role: EmployeeRole, key: PermKey, value: boolean) {
    setMatrix(prev => {
      if (!prev) return prev
      const updated: ProfilePermissions = { ...prev[role], [key]: value }
      if (!value) {
        for (const dependent of CASCADE_DISABLE[key] ?? []) {
          updated[dependent] = false
        }
      }
      return { ...prev, [role]: updated }
    })
    setDirty(prev => new Set(prev).add(role))
  }

  async function save(role: EmployeeRole) {
    if (!matrix) return
    setSaving(role)
    setError(null)
    try {
      await api.put(`/api/v1/profiles/${role}?branchId=${branchId}`, matrix[role])
      setDirty(prev => {
        const next = new Set(prev)
        next.delete(role)
        return next
      })
      setSaved(role)
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Error al guardar permisos')
    } finally {
      setSaving(null)
    }
  }

  if (!matrix) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-text-muted)]">
        Cargando permisos…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          Permisos por rol
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Configura qué puede hacer cada rol.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] w-56">
                Permiso
              </th>
              {EDITABLE_ROLES.map(role => (
                <th
                  key={role}
                  className="px-4 py-3 font-medium text-[var(--color-text-primary)] text-center min-w-[100px]"
                >
                  {ROLE_LABEL[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <>
                {/* Group header row */}
                <tr key={`group-${group}`} className="bg-[var(--color-bg)]">
                  <td
                    colSpan={EDITABLE_ROLES.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide"
                  >
                    {group}
                  </td>
                </tr>

                {PERMISSIONS.filter(p => p.group === group).map(perm => (
                  <tr
                    key={perm.key}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                      {perm.label}
                    </td>

                    {EDITABLE_ROLES.map(role => {
                      const lockedOff = perm.dependsOn ? !matrix[role][perm.dependsOn] : false
                      return (
                        <td key={role} className="px-4 py-2.5 text-center">
                          <div className="flex justify-center">
                            <Toggle
                              checked={lockedOff ? false : (matrix[role][perm.key] as boolean)}
                              disabled={lockedOff}
                              onChange={v => toggle(role, perm.key, v)}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>

          {/* Save row per column */}
          <tfoot>
            <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-bg)]">
              <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                Los cambios se aplican al próximo inicio de sesión
              </td>
              {EDITABLE_ROLES.map(role => (
                <td key={role} className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => save(role)}
                    disabled={!dirty.has(role) || saving === role}
                    aria-label={`Guardar ${ROLE_LABEL[role]}`}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      dirty.has(role)
                        ? saved === role
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-[var(--color-accent)] text-white hover:opacity-90'
                        : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed',
                    ].join(' ')}
                  >
                    {saving === role
                      ? 'Guardando…'
                      : saved === role
                      ? '✓ Guardado'
                      : 'Guardar'}
                  </button>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
