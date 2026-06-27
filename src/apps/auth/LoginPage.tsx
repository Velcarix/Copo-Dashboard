import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'
import { api, ApiError } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'
import type { ApiResponse, ProfilePermissions } from '@shared-types'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth, licenseKey } = useAuthStore()
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
        branch: { id: string; name: string }
        permissions: ProfilePermissions
      }>>(
        '/api/v1/auth/login',
        { username, password, licenseKey },
        { skipAuth: true },
      )
      const { user, accessToken, branch, permissions } = res.data
      setAuth(user, accessToken, permissions, branch.id)
      setBranches([{ id: branch.id, name: branch.name, city: '', isActive: true }])
      setSelected(branch.id)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-display font-bold text-[var(--color-accent)] mb-1">COPO</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">Inicia sesión</p>
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
