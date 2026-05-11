import { useRef } from 'react'
import { Settings2 } from 'lucide-react'
import { ProductImage } from '@/shared/components/ProductImage'
import { formatCurrency } from '@/shared/lib/currency'
import { ProductCategory } from '@shared-types'
import { usePosStore } from '@/shared/store/posStore'
import type { ProductWithModifiers } from '@/shared/store/posStore'

const CATEGORY_FALLBACK: Record<string, string> = {
  [ProductCategory.ICE_CREAM]: '🍦',
  [ProductCategory.COFFEE]: '☕',
  [ProductCategory.PASTRY]: '🥐',
  [ProductCategory.COMBO]: '🍱',
  [ProductCategory.EXTRA]: '✨',
}

interface ProductCardProps {
  product: ProductWithModifiers
  onTap: (product: ProductWithModifiers) => void
}

export function ProductCard({ product, onTap }: ProductCardProps) {
  const { soldOutIds, toggleSoldOut } = usePosStore()
  const isSoldOut = soldOutIds.includes(product.id)
  const hasModifiers = product.modifierGroups.length > 0

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  function startPress() {
    didLongPress.current = false
    timerRef.current = setTimeout(() => {
      didLongPress.current = true
      toggleSoldOut(product.id)
    }, 600)
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  function handleClick() {
    if (didLongPress.current) return
    if (isSoldOut) return
    onTap(product)
  }

  return (
    <button
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onClick={handleClick}
      className={[
        'relative flex flex-col items-center gap-1.5 p-2 rounded-xl text-center w-full select-none',
        'border transition-all duration-150',
        isSoldOut
          ? 'bg-[var(--color-bg)] border-[var(--color-border)] cursor-default'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] active:scale-95 hover:border-[var(--color-accent)] hover:shadow-sm',
      ].join(' ')}
      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      {/* Sold out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl z-10 bg-[var(--color-bg)]/60">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest bg-[var(--color-surface)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
            Agotado
          </span>
        </div>
      )}

      {/* Modifier indicator */}
      {hasModifiers && !isSoldOut && (
        <span
          aria-label="tiene modificadores"
          className="absolute top-1.5 right-1.5 text-[var(--color-text-muted)]"
        >
          <Settings2 size={11} strokeWidth={2} />
        </span>
      )}

      <ProductImage
        src={product.imageUrl}
        fallbackEmoji={CATEGORY_FALLBACK[product.category] ?? '🍽️'}
        alt={product.name}
        className={['w-16 h-16 rounded-lg transition-opacity', isSoldOut ? 'opacity-40' : ''].join(' ')}
      />
      <span className={['text-xs font-semibold leading-tight line-clamp-2', isSoldOut ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
        {product.name}
      </span>
      <span className={['text-xs font-bold tabular-nums', isSoldOut ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-accent)]'].join(' ')}>
        {formatCurrency(product.basePrice)}
      </span>
    </button>
  )
}
