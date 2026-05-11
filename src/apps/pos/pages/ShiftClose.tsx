import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { api, ApiError } from '@/shared/lib/api'
import { NumericKeypad } from '@/shared/components/NumericKeypad'
import { formatCurrency } from '@/shared/lib/currency'
import type { ApiResponse } from '@shared-types'

interface ShiftSummary {
  expectedCash: number
}

export function ShiftClose() {
  const navigate = useNavigate()
  const { shiftId, setShift } = useAuthStore()
  const [cash, setCash] = useState('')
  const [expectedCash, setExpectedCash] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!shiftId) return
    api.get<ApiResponse<ShiftSummary>>(`/api/v1/shifts/${shiftId}/summary`)
      .then(res => setExpectedCash(res.data.expectedCash))
      .catch(() => { /* non-critical */ })
  }, [shiftId])

  const cashCents = cash ? Math.round(parseFloat(cash) * 100) : 0
  const diff = expectedCash !== null ? cashCents - expectedCash : null
  const canConfirm = cash !== ''

  async function handleConfirm() {
    if (!canConfirm || !shiftId) return
    setLoading(true)
    setError('')
    try {
      await api.post<ApiResponse<{ id: string }>>(`/api/v1/shifts/${shiftId}/close`, {
        countedCash: cashCents,
      })
      setShift(null)
      navigate('/pos/shift/open')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cerrar turno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Cerrar turno</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ingresa el efectivo contado</p>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-[var(--color-accent)]">
            {cash ? formatCurrency(cashCents) : '$0.00'}
          </p>
        </div>

        {diff !== null && (
          <div className={[
            'flex justify-between rounded-xl px-4 py-2 text-sm font-bold',
            diff === 0 ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
              : diff > 0 ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700',
          ].join(' ')}>
            <span>Diferencia</span>
            <span>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
          </div>
        )}

        <NumericKeypad value={cash} onChange={setCash} showDecimal />

        {error && <p className="text-sm text-[var(--color-danger)] text-center">{error}</p>}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm || loading}
          aria-label="confirmar cierre de turno"
          className="w-full py-4 rounded-xl bg-[var(--color-danger)] text-white font-bold text-base disabled:opacity-40 transition-opacity"
        >
          {loading ? '…' : 'Confirmar cierre'}
        </button>
      </div>
    </div>
  )
}
