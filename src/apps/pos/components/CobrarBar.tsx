import { formatCurrency } from '@/shared/lib/currency'
import { useCartStore } from '@/shared/store/cartStore'

interface CobrarBarProps {
  total: number
  itemCount: number
  onCobrar: () => void
}

export function CobrarBar({ total, itemCount, onCobrar }: CobrarBarProps) {
  const editingOrder = useCartStore(s => s.editingOrder)
  const isEmpty = itemCount === 0

  let label: string
  if (isEmpty) {
    label = 'Carrito vacío'
  } else if (editingOrder) {
    label = total > editingOrder.originalTotal ? 'Guardar cambios y cobrar' : 'Guardar cambios'
  } else {
    label = `Cobrar (${itemCount})`
  }

  return (
    <button
      type="button"
      onClick={onCobrar}
      disabled={isEmpty}
      className={[
        'w-full min-h-[60px] rounded-xl font-bold text-base flex items-center justify-between px-5',
        'transition-all duration-150',
        'active:scale-[0.98]',
        isEmpty
          ? 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
          : 'bg-[var(--color-accent)] text-white hover:opacity-95 shadow-sm hover:shadow-md',
      ].join(' ')}
      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(total)}</span>
    </button>
  )
}
