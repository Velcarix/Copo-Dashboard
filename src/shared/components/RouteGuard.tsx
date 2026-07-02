import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { EmployeeRole } from '@shared-types'

interface RouteGuardProps {
  requireAuth?: boolean
  requireRole?: EmployeeRole[]
  redirectTo?: string
}

export function RouteGuard({
  requireAuth,
  requireRole,
  redirectTo = '/login',
}: RouteGuardProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  if (requireRole && user && !requireRole.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
