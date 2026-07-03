import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '@/shared/lib/api'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('El enlace no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/v1/auth/reset-password', { token, newPassword: password }, { skipAuth: true })
      setDone(true)
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

        {done ? (
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm"
            >
              Iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">Elige tu nueva contraseña</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-50"
              >
                {loading ? '…' : 'Guardar contraseña'}
              </button>
            </form>
            <Link
              to="/login"
              className="block text-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] mt-4"
            >
              Volver a iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
