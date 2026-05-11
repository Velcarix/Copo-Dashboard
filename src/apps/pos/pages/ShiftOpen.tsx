import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useNetworkStore } from '@/shared/store/networkStore'
import { api, ApiError } from '@/shared/lib/api'
import { NumericKeypad } from '@/shared/components/NumericKeypad'
import { formatCurrency } from '@/shared/lib/currency'
import { db } from '@/shared/lib/db'
import type { ApiResponse } from '@shared-types'
import { v4 as uuidv4 } from 'uuid'

export function ShiftOpen() {
  const navigate = useNavigate()
  const { user, setShift, branchId } = useAuthStore()
  const { isOnline } = useNetworkStore()
  const [cash, setCash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cashCents = cash ? Math.round(parseFloat(cash) * 100) : 0
  const canConfirm = cash !== ''

  async function handleConfirm() {
    if (!canConfirm || !user) return
    setLoading(true)
    setError('')

    try {
      if (isOnline) {
        const res = await api.post<ApiResponse<{ shiftId: string }>>('/api/v1/shifts/open', {
          branchId: branchId ?? '',
          employeeId: user.id,
          openingCash: cashCents,
        })
        setShift(res.data.shiftId)
        navigate('/pos')
      } else {
        // Offline: generate local shiftId and persist to Dexie
        const localShiftId = uuidv4()
        await db.currentShift.put({
          id: localShiftId,
          branchId: branchId ?? '',
          employeeId: user.id,
          openedAt: new Date().toISOString(),
          openingCash: cashCents,
          pendingSync: true,
        })
        setShift(localShiftId)
        navigate('/pos')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al abrir turno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Abrir turno</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ingresa el fondo inicial de caja</p>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-[var(--color-accent)]">
            {cash ? formatCurrency(cashCents) : '$0.00'}
          </p>
        </div>

        <NumericKeypad value={cash} onChange={setCash} showDecimal />

        {error && <p className="text-sm text-[var(--color-danger)] text-center">{error}</p>}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm || loading}
          aria-label="confirmar apertura de turno"
          className="w-full py-4 rounded-xl bg-[var(--color-accent)] text-white font-bold text-base disabled:opacity-40 transition-opacity"
        >
          {loading ? '…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
