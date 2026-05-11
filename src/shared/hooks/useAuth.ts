import { useAuthStore } from '@/shared/store/authStore'
import { EmployeeRole } from '@shared-types'

export function useAuth() {
  const { user, shiftId, isAuthenticated, logout } = useAuthStore()

  return {
    user,
    shiftId,
    isAuthenticated,
    role: user?.role ?? null,
    isOwner: user?.role === EmployeeRole.OWNER,
    isAdmin: user?.role === EmployeeRole.ADMIN,
    isCashier: user?.role === EmployeeRole.CASHIER,
    hasShift: shiftId !== null,
    logout,
  }
}
