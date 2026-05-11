import { create } from 'zustand'
import type { EmployeeRole, ProfilePermissions } from '@shared-types'

interface AuthUser {
  id: string
  name: string
  role: EmployeeRole
}

interface AuthState {
  user: AuthUser | null
  permissions: ProfilePermissions | null
  accessToken: string | null
  branchId: string | null
  shiftId: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string, permissions?: ProfilePermissions, branchId?: string) => void
  setPermissions: (permissions: ProfilePermissions) => void
  setShift: (shiftId: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  permissions: null,
  accessToken: null,
  branchId: null,
  shiftId: null,
  isAuthenticated: false,

  setAuth(user, accessToken, permissions, branchId) {
    set({ user, accessToken, isAuthenticated: true, permissions: permissions ?? null, branchId: branchId ?? null })
  },

  setPermissions(permissions) {
    set({ permissions })
  },

  setShift(shiftId) {
    set({ shiftId })
  },

  logout() {
    set({ user: null, permissions: null, accessToken: null, branchId: null, shiftId: null, isAuthenticated: false })
  },
}))
