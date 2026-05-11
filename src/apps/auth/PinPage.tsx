import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'
import { useNetworkStore } from '@/shared/store/networkStore'
import { NumericKeypad } from '@/shared/components/NumericKeypad'
import { api, ApiError } from '@/shared/lib/api'
import { db } from '@/shared/lib/db'
import { EmployeeRole } from '@shared-types'
import { v4 as uuidv4 } from 'uuid'
import type { ApiResponse, ProfilePermissions } from '@shared-types'

const PIN_LENGTH = 4

export function PinPage() {
  const navigate = useNavigate()
  const { setAuth, setShift } = useAuthStore()
  const { selected, branches } = useBranchStore()
  const { isOnline } = useNetworkStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resolvedBranchId = selected()?.id ?? branches[0]?.id ?? ''

  async function handlePinChange(value: string) {
    const next = value.slice(0, PIN_LENGTH)
    setPin(next)
    setError('')
    if (next.length === PIN_LENGTH) await verifyPin(next)
  }

  async function verifyPin(enteredPin: string) {
    setLoading(true)

    if (!resolvedBranchId) {
      setError('No hay sucursal configurada. Inicia sesión como dueño primero.')
      setPin('')
      setLoading(false)
      return
    }

    try {
      if (isOnline) {
        const res = await api.post<ApiResponse<{
          shiftToken: string
          employee: { id: string; name: string; role: EmployeeRole }
          existingShiftId: string | null
          permissions: ProfilePermissions
        }>>(
          '/api/v1/auth/pin-verify',
          { pin: enteredPin, branchId: resolvedBranchId },
          { skipAuth: true },
        )
        setAuth(
          { id: res.data.employee.id, name: res.data.employee.name, role: res.data.employee.role },
          res.data.shiftToken,
          res.data.permissions,
          resolvedBranchId,
        )
        if (res.data.existingShiftId) {
          setShift(res.data.existingShiftId)
        }
        if (res.data.permissions.canAccessKitchen && !res.data.permissions.canAccessPOS) {
          navigate('/kitchen')
        } else if (res.data.existingShiftId) {
          navigate('/pos')
        } else {
          navigate('/pos/shift/open')
        }
      } else {
        const employees = await db.employeePins.toArray()
        // TODO Plan 2: replace with bcrypt.compare(enteredPin, e.pinHash)
        // Foundation placeholder: pinHash stores hash synced from server; bcrypt unavailable in this build yet
        const match = employees.find(e => e.pinHash === enteredPin)
        if (!match) throw new Error('PIN incorrecto')
        const localToken = uuidv4()
        setAuth(
          { id: match.id, name: match.name, role: match.role as EmployeeRole },
          localToken,
        )
        navigate('/pos/shift/open')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'PIN incorrecto')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-xs">
        <h1 className="text-3xl font-display font-bold text-[var(--color-accent)] mb-1 text-center">COPO</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8 text-center">Ingresa tu PIN</p>
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={[
                'w-4 h-4 rounded-full border-2 transition-all',
                i < pin.length
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                  : 'border-[var(--color-border)]',
              ].join(' ')}
            />
          ))}
        </div>
        {error && <p className="text-sm text-[var(--color-danger)] text-center mb-4">{error}</p>}
        {loading && <p className="text-sm text-[var(--color-text-muted)] text-center mb-4">Verificando…</p>}
        <NumericKeypad value={pin} onChange={handlePinChange} maxDigits={PIN_LENGTH} />
        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          ¿Eres el dueño?{' '}
          <Link to="/login" className="text-[var(--color-accent)] font-semibold">
            Ingresa con email
          </Link>
        </p>
      </div>
    </div>
  )
}
