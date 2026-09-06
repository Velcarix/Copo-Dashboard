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
 * Solo OWNER puede pedir 'all': su token es el único que representa realmente
 * todas las sucursales del negocio (ver requireAuth en el backend), así que para
 * el resto se cae a la sucursal de sesión en vez de provocar un 403 silencioso.
 */
export function useDataViewBranchParam(): { branchParam: string | null; isAll: boolean } {
  const activeBranchId = useAuthStore(s => s.branchId)
  const isOwner = useAuthStore(s => s.user?.role === EmployeeRole.OWNER)
  const selectedId = useBranchStore(s => s.selectedId)

  if (selectedId === 'ALL') {
    return isOwner
      ? { branchParam: 'all', isAll: true }
      : { branchParam: activeBranchId, isAll: false }
  }
  return { branchParam: selectedId ?? activeBranchId, isAll: false }
}
