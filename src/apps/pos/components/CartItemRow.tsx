import { Pencil, Minus, Plus } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/currency'
import type { CartItem } from '@shared-types'

interface CartItemRowProps {
  item: CartItem
  onQtyChange: (localId: string, qty: number) => void
  onRemove: (localId: string) => void
  onEdit: (item: CartItem) => void
}

export function CartItemRow({ item, onQtyChange, onRemove, onEdit }: CartItemRowProps) {
  const itemTotal = (item.unitPrice + item.modifiers.reduce((s, m) => s + m.priceDelta, 0)) * item.quantity

  function handleDecrement() {
    if (item.quantity <= 1) {
      onRemove(item.localId)
    } else {
      onQtyChange(item.localId, item.quantity - 1)
    }
  }

  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 justify-between">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{item.productName}</span>
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label="Editar producto"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] active:scale-95 transition-all duration-100"
          >
            <Pencil size={13} strokeWidth={2} />
          </button>
        </div>
        {item.modifiers.length > 0 && (
          <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
            {item.modifiers.map(m => m.optionName).join(', ')}
          </p>
        )}
        {item.note && (
          <p className="text-xs text-[var(--color-text-muted)] italic truncate mt-0.5">{item.note}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDecrement}
          aria-label="Disminuir cantidad"
          className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] active:scale-90 transition-all duration-100"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <span className="text-sm font-bold min-w-[1.25rem] text-center tabular-nums">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onQtyChange(item.localId, item.quantity + 1)}
          aria-label="Aumentar cantidad"
          className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] active:scale-90 transition-all duration-100"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      <span className="text-sm font-bold text-[var(--color-text-primary)] shrink-0 ml-1 tabular-nums">
        {formatCurrency(itemTotal)}
      </span>
    </div>
  )
}
