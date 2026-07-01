import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'
import { api, ApiError } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'

const ROLE_LABELS: Record<EmployeeRole, string> = {
  [EmployeeRole.OWNER]:   'Dueño',
  [EmployeeRole.ADMIN]:   'Administrador',
  [EmployeeRole.CASHIER]: 'Cajero',
  [EmployeeRole.WAITER]:  'Mesero',
  [EmployeeRole.KITCHEN]: 'Cocina',
}

const BRANCH_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899']

export function BranchSelectorPage() {
  const navigate = useNavigate()
  const { availableBranches, updateAuthToken } = useAuthStore()
  const { setSelected } = useBranchStore()
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSelect(branchId: string, role: EmployeeRole) {
    setSelecting(branchId)
    setError('')
    try {
      const res = await api.post<{ data: { accessToken: string; branch: { id: string; name: string } } }>(
        '/api/v1/auth/switch-branch',
        { targetBranchId: branchId },
      )
      updateAuthToken(res.data.accessToken, branchId, role)
      setSelected(branchId)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cambiar sucursal')
    } finally {
      setSelecting(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-display font-bold text-[var(--color-accent)] mb-1">COPO</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">Selecciona una sucursal para continuar</p>
        <p className="text-xs text-[var(--color-text-muted)] mb-6">
          Tienes acceso a {availableBranches.length} sucursales
        </p>

        <div className="space-y-3">
          {availableBranches.map((branch, idx) => {
            const color = BRANCH_COLORS[idx % BRANCH_COLORS.length]
            const isLoading = selecting === branch.id
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => handleSelect(branch.id, branch.role)}
                disabled={selecting !== null}
                className={[
                  'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all',
                  'bg-[var(--color-surface)] border-[var(--color-border)]',
                  'hover:border-[var(--color-accent)] hover:shadow-md',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  isLoading ? 'border-[var(--color-accent)] shadow-md' : '',
                ].join(' ')}
              >
                <span
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: color }}
                >
                  {branch.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] truncate">{branch.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{ROLE_LABELS[branch.role] ?? branch.role}</p>
                </div>
                {isLoading ? (
                  <span className="text-xs text-[var(--color-accent)]">Entrando…</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-[var(--color-danger)] text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
