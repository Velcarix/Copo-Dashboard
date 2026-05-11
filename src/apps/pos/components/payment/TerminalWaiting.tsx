import { useEffect, useRef, useState } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { PaymentStatus, TerminalStatusResponse } from '@shared-types'

const POLL_INTERVAL = 3_000
const TIMEOUT_SECONDS = 90

interface TerminalWaitingProps {
  intentId: string
  amount: number
  onSuccess: (transactionId?: string) => void
  onError: (status: PaymentStatus) => void
  onTimeout: () => void
  onCancel: () => void
}

export function TerminalWaiting({ intentId, amount, onSuccess, onError, onTimeout, onCancel }: TerminalWaitingProps) {
  const [remaining, setRemaining] = useState(TIMEOUT_SECONDS)
  const [message, setMessage] = useState('Acerque la tarjeta al terminal')
  const stopped = useRef(false)

  useEffect(() => {
    stopped.current = false

    // Countdown ticker
    const tick = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(tick)
          if (!stopped.current) {
            stopped.current = true
            onTimeout()
          }
          return 0
        }
        return r - 1
      })
    }, 1_000)

    // Polling
    const poll = setInterval(async () => {
      if (stopped.current) return
      try {
        const res = await api.get<TerminalStatusResponse>(`/api/v1/payments/${intentId}/status`)
        if (stopped.current) return
        if (res.status === PaymentStatus.COMPLETED) {
          stopped.current = true
          clearInterval(poll)
          clearInterval(tick)
          onSuccess(res.transactionId ?? undefined)
        } else if (res.status === PaymentStatus.DECLINED || res.status === PaymentStatus.CANCELLED) {
          stopped.current = true
          clearInterval(poll)
          clearInterval(tick)
          onError(res.status)
        }
      } catch {
        setMessage('Sin conexión — esperando reconexión…')
      }
    }, POLL_INTERVAL)

    return () => {
      stopped.current = true
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [intentId, onSuccess, onError, onTimeout])

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="w-20 h-20 rounded-full border-4 border-[var(--color-accent)] border-t-transparent animate-spin" />
      <div className="text-center space-y-1">
        <p className="font-bold text-[var(--color-text-primary)]">{formatCurrency(amount)}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{remaining}s</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-[var(--color-danger)] underline"
      >
        Cancelar pago
      </button>
    </div>
  )
}
