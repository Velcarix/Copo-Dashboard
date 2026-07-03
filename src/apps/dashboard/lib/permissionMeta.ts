import { EmployeeRole, type ProfilePermissions } from '@shared-types'

// Shared permission metadata — used by both the per-role matrix (RolesPage)
// and the per-employee custom override editor (EmployeesPage).

export type PermKey = keyof Omit<ProfilePermissions, 'role'>

export interface PermMeta {
  key: PermKey
  label: string
  group: string
  /** This permission only makes sense when `dependsOn` is enabled — auto-disabled otherwise. */
  dependsOn?: PermKey
}

export const PERMISSIONS: PermMeta[] = [
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
export const CASCADE_DISABLE: Partial<Record<PermKey, PermKey[]>> = {
  canAccessPOS: ['canApplyDiscounts', 'canCancelOrders', 'canSkipShiftOpen', 'canSkipShiftClose'],
  canAccessComandero: ['canManageTables', 'canAddTables'],
}

/** Applies cascade-disable rules to a permission object after setting `key` to `value`. */
export function applyCascade(perms: ProfilePermissions, key: PermKey, value: boolean): ProfilePermissions {
  const updated: ProfilePermissions = { ...perms, [key]: value }
  if (!value) {
    for (const dependent of CASCADE_DISABLE[key] ?? []) {
      updated[dependent] = false
    }
  }
  return updated
}

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  [EmployeeRole.CASHIER]: 'Cajero',
  [EmployeeRole.WAITER]:  'Mesero',
  [EmployeeRole.KITCHEN]: 'Cocina',
  [EmployeeRole.ADMIN]:   'Admin',
  [EmployeeRole.OWNER]:   'Dueño',
}

// DEV mock — used as fallback default profiles when the backend isn't reachable
export const MOCK_PROFILES: ProfilePermissions[] = [
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
