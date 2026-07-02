import { useAuthStore } from '@/shared/store/authStore'
import { EmployeeRole } from '@shared-types'

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore()

  return {
    user,
    isAuthenticated,
    role: user?.role ?? null,
    isOwner: user?.role === EmployeeRole.OWNER,
    isAdmin: user?.role === EmployeeRole.ADMIN,
    logout,
  }
}
