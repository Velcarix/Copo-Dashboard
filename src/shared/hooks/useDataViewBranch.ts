import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'

/**
 * Resolves the branch id that query/report screens should use — the "Vista de
 * datos" selection — independently from "Sesión activa" (`authStore.branchId`,
 * the branch the employee is operating on).
 *
 * Screens that don't support an aggregated "todas las sucursales" view (Reportes,
 * Órdenes, Inventario, Productos) fall back to the active session branch when
 * "Vista de datos" is set to 'ALL', since there's no single branchId to query.
 */
export function useSingleDataViewBranchId(): string | null {
  const activeBranchId = useAuthStore(s => s.branchId)
  const selectedId = useBranchStore(s => s.selectedId)
  if (!selectedId || selectedId === 'ALL') return activeBranchId
  return selectedId
}
