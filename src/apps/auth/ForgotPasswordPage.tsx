import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { api, ApiError } from '@/shared/lib/api'

export function ForgotPasswordPage() {
  const { licenseKey, branchName, businessName } = useAuthStore()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!licenseKey) {
      setError('No hay una licencia activa en este dispositivo. Vuelve a iniciar sesión desde el POS.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/v1/auth/forgot-password', { username, licenseKey }, { skipAuth: true })
      setSent(true)
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

        {(businessName || branchName) && (
          <div className="mb-6 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            {businessName && (
              <p className="text-xs text-[var(--color-text-muted)] leading-tight">{businessName}</p>
            )}
            {branchName && (
              <p className="text-sm font-medium text-[var(--color-text-primary)] leading-tight truncate">{branchName}</p>
            )}
          </div>
        )}

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Si el usuario existe y tiene acceso al dashboard, te enviamos un correo con instrucciones para restablecer tu contraseña.
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Ingresa tu usuario y te enviaremos un enlace a tu correo para restablecer tu contraseña.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuario"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-50"
              >
                {loading ? '…' : 'Enviar enlace'}
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
