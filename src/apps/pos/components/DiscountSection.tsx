import { useState } from 'react'
import { useCartStore } from '@/shared/store/cartStore'
import { DiscountType } from '@shared-types'
import { formatCurrency } from '@/shared/lib/currency'

export function DiscountSection() {
  const { discount, discountAmount, applyDiscount } = useCartStore()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<DiscountType>(DiscountType.PERCENT)
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')

  function handleApply() {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0 || !reason.trim()) return
    applyDiscount({
      type,
      value: type === DiscountType.FIXED ? Math.round(num * 100) : num,
      reason: reason.trim(),
    })
    setOpen(false)
  }

  function handleRemove() {
    applyDiscount(null)
    setValue('')
    setReason('')
  }

  if (discount) {
    return (
      <div className="flex items-center justify-between text-sm py-1">
        <span className="text-[var(--color-text-muted)]">Descuento ({discount.reason})</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-success)] font-bold">−{formatCurrency(discountAmount)}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-[var(--color-danger)] text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs text-[var(--color-accent)] font-semibold"
      >
        {open ? '▲ Cancelar' : '% Agregar descuento'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            {[DiscountType.PERCENT, DiscountType.FIXED].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  'flex-1 py-1 rounded-lg text-xs font-semibold border',
                  type === t
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
                ].join(' ')}
              >
                {t === DiscountType.PERCENT ? '% Porcentaje' : '$ Fijo'}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={type === DiscountType.PERCENT ? 'Ej: 10 (%)' : 'Ej: 50 (pesos)'}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
          />
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Motivo (requerido)"
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={!value || !reason.trim()}
            className="w-full py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
