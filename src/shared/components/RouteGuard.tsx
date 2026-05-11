import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { EmployeeRole } from '@shared-types'

interface RouteGuardProps {
  requireAuth?: boolean
  requireRole?: EmployeeRole[]
  requireShift?: boolean
  redirectTo?: string
}

export function RouteGuard({
  requireAuth,
  requireRole,
  requireShift,
  redirectTo = '/login',
}: RouteGuardProps) {
  const { isAuthenticated, user, shiftId } = useAuthStore()

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  if (requireRole && user && !requireRole.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  if (requireShift && user?.role !== EmployeeRole.OWNER && !shiftId) {
    return <Navigate to="/pos/shift/open" replace />
  }

  return <Outlet />
}
