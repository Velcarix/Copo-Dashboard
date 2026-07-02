import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import type { AvailableBranch } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'
import { api, ApiError } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'
import type { ApiResponse, ProfilePermissions } from '@shared-types'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth, licenseKey, branchName, businessName, clearLicense } = useAuthStore()
  const { setBranches, setSelected } = useBranchStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post<ApiResponse<{
        accessToken: string
        user: { id: string; name: string; role: EmployeeRole }
        branch: { id: string; name: string; businessId: string }
        permissions: ProfilePermissions
        availableBranches?: AvailableBranch[]
      }>>(
        '/api/v1/auth/login',
        { username, password, licenseKey },
        { skipAuth: true },
      )
      const { user, accessToken, branch, permissions, availableBranches } = res.data

      if (!permissions?.canAccessDashboard) {
        setError('No tienes permiso para acceder al dashboard')
        return
      }

      setAuth(user, accessToken, permissions, branch.id, availableBranches ?? [])

      const allBranches = (availableBranches ?? [{ id: branch.id, name: branch.name, role: user.role }])
      setBranches(allBranches.map(b => ({ id: b.id, name: b.name, city: '', isActive: true })))
      setSelected(branch.id)

      if ((availableBranches ?? []).length > 1) {
        navigate('/branch-select')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function handleClearLicense() {
    clearLicense()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-display font-bold text-[var(--color-accent)] mb-1">COPO</h1>

        {(businessName || branchName) && (
          <div className="mb-6 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start justify-between gap-3">
            <div className="min-w-0">
              {businessName && (
                <p className="text-xs text-[var(--color-text-muted)] leading-tight">{businessName}</p>
              )}
              {branchName && (
                <p className="text-sm font-medium text-[var(--color-text-primary)] leading-tight truncate">{branchName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearLicense}
              title="Cambiar licencia"
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        <p className="text-sm text-[var(--color-text-secondary)] mb-6">Inicia sesión</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Usuario"
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-50"
          >
            {loading ? '…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
