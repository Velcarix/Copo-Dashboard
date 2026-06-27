import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { EmployeeRole, ProfilePermissions } from '@shared-types'

const LICENSE_KEY = 'copo_license_key'

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
  branchName: string | null
  shiftId: string | null
  licenseKey: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string, permissions?: ProfilePermissions, branchId?: string) => void
  setPermissions: (permissions: ProfilePermissions) => void
  setShift: (shiftId: string | null) => void
  setLicense: (key: string, branchName: string) => void
  clearLicense: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      permissions: null,
      accessToken: null,
      branchId: null,
      branchName: null,
      shiftId: null,
      licenseKey: null,
      isAuthenticated: false,

      setAuth(user, accessToken, permissions, branchId) {
        set({
          user,
          accessToken,
          isAuthenticated: true,
          permissions: permissions ?? null,
          branchId: branchId ?? null
        })
      },

      setPermissions(permissions) {
        set({ permissions })
      },

      setShift(shiftId) {
        set({ shiftId })
      },

      setLicense(key, branchName) {
        localStorage.setItem(LICENSE_KEY, key)
        set({ licenseKey: key, branchName })
      },

      clearLicense() {
        localStorage.removeItem(LICENSE_KEY)
        set({ licenseKey: null, branchName: null })
      },

      logout() {
        set({
          user: null,
          permissions: null,
          accessToken: null,
          branchId: null,
          shiftId: null,
          isAuthenticated: false
        })
      },
    }),
    {
      name: 'copo-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
