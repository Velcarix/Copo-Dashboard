import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePosStore, selectFilteredProducts } from '@/shared/store/posStore'
import { useCartStore } from '@/shared/store/cartStore'
import { CategoryPills } from '../components/CategoryPills'
import { ProductCard } from '../components/ProductCard'
import { ModifierSheet } from '../components/modifiers/ModifierSheet'
import { CartPanel } from '../components/CartPanel'
import { PaymentModal } from '../components/payment/PaymentModal'
import { useAuthStore } from '@/shared/store/authStore'
import type { ProductWithModifiers } from '@/shared/store/posStore'
import type { CartItem } from '@shared-types'

export function POSMain() {
  const navigate = useNavigate()
  const { activeCategory, isLoading, setCategory, refreshProducts } = usePosStore()
  const branchId = useAuthStore(s => s.branchId) ?? ''
  const products = usePosStore(selectFilteredProducts)
  const { items } = useCartStore()
  const editingOrder = useCartStore(s => s.editingOrder)

  // Modifier sheet state
  const [modifierProduct, setModifierProduct] = useState<ProductWithModifiers | null>(null)
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false)

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')

  // Load products on mount
  useEffect(() => {
    refreshProducts(branchId)
  }, [refreshProducts, branchId])

  function handleProductTap(product: ProductWithModifiers) {
    if (product.modifierGroups.length > 0) {
      setModifierProduct(product)
    } else {
      useCartStore.getState().addItem(product, [])
    }
  }

  function handleModifierConfirm(modifiers: import('@shared-types').CartItemModifier[], note: string | undefined) {
    if (!modifierProduct) return
    if (editingItem) {
      useCartStore.getState().updateItem(editingItem.localId, modifiers, note)
      setEditingItem(null)
    } else {
      useCartStore.getState().addItem(modifierProduct, modifiers, note)
    }
    setModifierProduct(null)
  }

  function handleEditItem(item: CartItem) {
    const product = usePosStore.getState().products.find(p => p.id === item.productId)
    if (product) {
      setEditingItem(item)
      setModifierProduct(product)
    }
  }

  function handleCobrar() {
    const { editingOrder: editing, totalAmount } = useCartStore.getState()
    if (editing && totalAmount <= editing.originalTotal) {
      // No extra charge needed — just save and go back
      useCartStore.getState().clearCart()
      navigate('/pos/history', {
        state: { savedEdit: { orderId: editing.orderId, newTotal: totalAmount } },
      })
    } else {
      setShowPayment(true)
    }
  }

  function handlePaymentSuccess() {
    setShowPayment(false)
    const { editingOrder: editing, totalAmount } = useCartStore.getState()
    if (editing) {
      const savedEdit = { orderId: editing.orderId, newTotal: totalAmount }
      useCartStore.getState().clearCart()
      navigate('/pos/history', { state: { savedEdit } })
    }
  }

  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="flex h-full">
      {/* Products panel */}
      <div className={[
        'flex flex-col flex-1 min-w-0',
        'md:flex',
        mobileTab === 'cart' ? 'hidden' : 'flex',
      ].join(' ')}>
        {/* Category + search header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
          <div className="flex-1 overflow-hidden">
            <CategoryPills active={activeCategory as import('@shared-types').ProductCategory | 'ALL'} onChange={setCategory} />
          </div>

          {/* History button — desktop only */}
          <Link
            to="/pos/history"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors shrink-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>Historial</span>
          </Link>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)] text-sm">Cargando…</div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)] text-sm">Sin productos</div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
              {products.map(p => (
                <ProductCard key={p.id} product={p} onTap={handleProductTap} />
              ))}
            </div>
          )}
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden border-t border-[var(--color-border)] flex shrink-0">
          {([
            { id: 'products' as const, label: 'Productos' },
            { id: 'cart'     as const, label: `Carrito${itemCount > 0 ? ` (${itemCount})` : ''}` },
          ]).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={[
                'flex-1 py-3 text-xs font-bold',
                mobileTab === tab.id
                  ? 'text-[var(--color-accent)] border-t-2 border-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
          <Link
            to="/pos/history"
            className="flex-1 py-3 text-xs font-bold text-[var(--color-text-muted)] flex items-center justify-center"
          >
            Historial
          </Link>
        </div>
      </div>

      {/* Cart panel (desktop always visible, mobile tab) */}
      <div className={[
        'w-full md:w-72 lg:w-80 flex-col flex',
        mobileTab === 'cart' ? 'flex' : 'hidden md:flex',
      ].join(' ')}>
        <CartPanel
          onCobrar={handleCobrar}
          onEditItem={handleEditItem}
        />
      </div>

      {/* Modifier sheet overlay */}
      <ModifierSheet
        product={modifierProduct}
        onConfirm={handleModifierConfirm}
        onClose={() => { setModifierProduct(null); setEditingItem(null) }}
      />

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Edit mode banner */}
      {editingOrder && (
        <div className="fixed bottom-0 left-0 right-0 md:right-72 lg:right-80 pointer-events-none z-30">
          <div className="mx-3 mb-3 px-4 py-2 rounded-xl bg-blue-600/90 backdrop-blur-sm text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editando orden {editingOrder.orderNumber}
          </div>
        </div>
      )}
    </div>
  )
}
