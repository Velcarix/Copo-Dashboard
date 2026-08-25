import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'

interface LoyaltyStatus {
  linked: boolean
}

export function LoyaltyIntegrationSection() {
  const [status, setStatus] = useState<LoyaltyStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [code, setCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [error, setError] = useState('')

  function loadStatus() {
    setLoadingStatus(true)
    api.get<{ data: LoyaltyStatus }>('/api/v1/loyalty-integration/status')
      .then(res => setStatus(res.data))
      .catch(() => setStatus({ linked: false }))
      .finally(() => setLoadingStatus(false))
  }

  useEffect(() => { loadStatus() }, [])

  async function handleLink() {
    if (code.trim().length !== 8) {
      setError('El código debe tener 8 dígitos')
      return
    }
    setError('')
    setLinking(true)
    try {
      await api.post('/api/v1/loyalty-integration/link', { code: code.trim() })
      setCode('')
      loadStatus()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo vincular con Copo Loyalty')
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink() {
    setError('')
    setUnlinking(true)
    try {
      await api.delete('/api/v1/loyalty-integration/link')
      loadStatus()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo desvincular')
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] space-y-4">
      <h2 className="font-semibold text-[var(--color-text-primary)] text-sm uppercase tracking-wide">Copo Loyalty</h2>

      {loadingStatus ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando estado…</p>
      ) : status?.linked ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-success)]">
            ✓ Vinculado con Copo Loyalty
          </p>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={unlinking}
            className="px-4 py-2 rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] text-sm font-medium disabled:opacity-40"
          >
            {unlinking ? 'Desvinculando…' : 'Desvincular'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Genera un código en Copo Loyalty (Ajustes → Conectar Copo POS) y pégalo aquí para vincular las cuentas.
          </p>
          <div className="flex gap-2 items-end max-w-sm">
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Código de 8 dígitos</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="12345678"
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <button
              type="button"
              onClick={handleLink}
              disabled={linking || code.length !== 8}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-bold disabled:opacity-40"
            >
              {linking ? 'Vinculando…' : 'Vincular'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}
