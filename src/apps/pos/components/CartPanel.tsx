import { ShoppingCart, PlusCircle, X, User } from 'lucide-react'
import { useCartStore } from '@/shared/store/cartStore'
import { formatCurrency } from '@/shared/lib/currency'
import { CartItemRow } from './CartItemRow'
import { DiscountSection } from './DiscountSection'
import { CobrarBar } from './CobrarBar'
import type { CartItem } from '@shared-types'

interface CartPanelProps {
  onCobrar: () => void
  onEditItem: (item: CartItem) => void
}

export function CartPanel({ onCobrar, onEditItem }: CartPanelProps) {
  const {
    items, totalAmount, subtotal, discountAmount,
    customerName, parkedCarts,
    removeItem, updateQty, setCustomerName, parkCart, restoreCart, removeParked,
  } = useCartStore()

  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] border-l border-[var(--color-border)]">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-[var(--color-text-secondary)] tracking-wide">CARRITO</h2>
            {itemCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                {itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={parkCart}
            disabled={items.length === 0}
            title="Nuevo pedido (guarda el actual en espera)"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <PlusCircle size={15} strokeWidth={2} />
            <span className="hidden lg:inline">Nuevo pedido</span>
          </button>
        </div>
      </div>

      {/* ── Pedidos en espera ── */}
      {parkedCarts.length > 0 && (
        <div className="px-3 py-2 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-bg)]">
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
            En espera
          </p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {parkedCarts.map((cart, i) => (
              <div key={cart.id} className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => restoreCart(cart.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] active:scale-95 transition-all duration-100 text-left"
                >
                  <span className="text-xs font-bold text-[var(--color-accent)]">#{i + 1}</span>
                  <div className="min-w-0">
                    {cart.customerName ? (
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[80px]">
                        {cart.customerName}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[80px]">
                        {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                      {formatCurrency(cart.totalAmount)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeParked(cart.id)}
                  aria-label="Eliminar pedido en espera"
                  className="w-5 h-5 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Nombre del cliente ── */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[var(--color-accent)] transition-colors">
          <User size={13} strokeWidth={2} className="text-[var(--color-text-muted)] shrink-0" />
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Nombre del cliente (opcional)"
            className="flex-1 text-xs bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
          {customerName && (
            <button
              type="button"
              onClick={() => setCustomerName('')}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ── Items ── */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-[var(--color-text-muted)]">
            <ShoppingCart size={36} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-medium">Carrito vacío</p>
              <p className="text-xs mt-0.5 opacity-70">Toca un producto para agregarlo</p>
            </div>
          </div>
        ) : (
          items.map(item => (
            <CartItemRow
              key={item.localId}
              item={item}
              onQtyChange={updateQty}
              onRemove={removeItem}
              onEdit={onEditItem}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 space-y-2 border-t border-[var(--color-border)] shrink-0">
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
        )}
        <DiscountSection />
        <div className="flex justify-between font-bold">
          <span className="text-[var(--color-text-primary)]">TOTAL</span>
          <span className="text-[var(--color-text-primary)] tabular-nums">{formatCurrency(totalAmount)}</span>
        </div>
        <CobrarBar total={totalAmount} itemCount={itemCount} onCobrar={onCobrar} />
      </div>
    </div>
  )
}
