import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'
import { EmployeeRole } from '@shared-types'

/**
 * Resolves the branch id that query/report screens should use — the "Vista de
 * datos" selection — independently from "Sesión activa" (`authStore.branchId`,
 * the branch the employee is operating on).
 *
 * Screens that don't support an aggregated "todas las sucursales" view (Órdenes,
 * Inventario, Productos) fall back to the active session branch when
 * "Vista de datos" is set to 'ALL', since there's no single branchId to query.
 */
export function useSingleDataViewBranchId(): string | null {
  const activeBranchId = useAuthStore(s => s.branchId)
  const selectedId = useBranchStore(s => s.selectedId)
  if (!selectedId || selectedId === 'ALL') return activeBranchId
  return selectedId
}

/**
 * Same selection, but for screens that DO support the consolidated view
 * (Reportes, Inicio). Returns the value to send as `branchId` in the query —
 * `'all'` in lowercase, which is what the backend expects — plus `isAll` so the
 * screen can switch to its per-branch layout.
 *
 * Puede pedir 'all' cualquier empleado con acceso a más de una sucursal, no solo
 * OWNER: el backend acota la vista consolidada al negocio y — cuando no es OWNER —
 * a sus availableBranches (ver requireAuth y lib/branchScope.ts). Con una sola
 * sucursal no hay nada que consolidar, así que se cae a la sesión activa en vez de
 * provocar un 403 silencioso.
 */
export function useDataViewBranchParam(): { branchParam: string | null; isAll: boolean } {
  const activeBranchId = useAuthStore(s => s.branchId)
  const canViewAll = useAuthStore(s => canSelectAllBranches(s.user?.role, s.availableBranches?.length ?? 0))
  const selectedId = useBranchStore(s => s.selectedId)

  if (selectedId === 'ALL') {
    return canViewAll
      ? { branchParam: 'all', isAll: true }
      : { branchParam: activeBranchId, isAll: false }
  }
  return { branchParam: selectedId ?? activeBranchId, isAll: false }
}

/**
 * Quién ve la opción "Todas las sucursales" (Sesión activa) y puede consultar la
 * vista consolidada. Debe coincidir con `isBranchAllowedForRequest` del backend.
 */
export function canSelectAllBranches(role: EmployeeRole | undefined, availableBranchCount: number): boolean {
  return role === EmployeeRole.OWNER || availableBranchCount > 1
}
