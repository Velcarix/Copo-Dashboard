import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { DiscountType } from '@shared-types'
import type { CartItem, CartItemModifier, CartDiscount } from '@shared-types'

function modifiersKey(mods: CartItemModifier[]): string {
  return [...mods].sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map(m => `${m.optionId}:${m.priceDelta}`).join('|')
}

function computeTotals(items: CartItem[], discount: CartDiscount | null) {
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = (item.unitPrice + item.modifiers.reduce((s, m) => s + m.priceDelta, 0)) * item.quantity
    return sum + itemTotal
  }, 0)

  let discountAmount = 0
  if (discount) {
    discountAmount = discount.type === DiscountType.FIXED
      ? discount.value
      : Math.round(subtotal * discount.value / 100)
  }

  return { subtotal, discountAmount, totalAmount: Math.max(0, subtotal - discountAmount) }
}

export interface ParkedCart {
  id: string
  customerName: string
  items: CartItem[]
  discount: CartDiscount | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  parkedAt: string
}

export interface EditingOrder {
  orderId: string
  orderNumber: string
  originalTotal: number
}

interface CartState {
  items: CartItem[]
  orderId: string
  customerName: string
  discount: CartDiscount | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  parkedCarts: ParkedCart[]
  editingOrder: EditingOrder | null

  addItem: (product: { id: string; name: string; basePrice: number }, modifiers: CartItemModifier[], note?: string) => void
  removeItem: (localId: string) => void
  updateQty: (localId: string, qty: number) => void
  updateItem: (localId: string, modifiers: CartItemModifier[], note?: string) => void
  applyDiscount: (discount: CartDiscount | null) => void
  setCustomerName: (name: string) => void
  clearCart: () => void
  regenerateOrderId: () => void
  setEditingOrder: (data: EditingOrder) => void
  clearEditingOrder: () => void

  // Parked orders
  parkCart: () => void
  restoreCart: (id: string) => void
  removeParked: (id: string) => void
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderId: uuidv4(),
  customerName: '',
  discount: null,
  subtotal: 0,
  discountAmount: 0,
  totalAmount: 0,
  parkedCarts: [],
  editingOrder: null,

  addItem(product, modifiers, note) {
    const state = get()
    const key = modifiersKey(modifiers)
    const existing = state.items.find(
      i => i.productId === product.id && modifiersKey(i.modifiers) === key && !note,
    )
    let items: CartItem[]
    if (existing) {
      items = state.items.map(i =>
        i.localId === existing.localId ? { ...i, quantity: i.quantity + 1 } : i,
      )
    } else {
      const newItem: CartItem = {
        localId: uuidv4(),
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.basePrice,
        modifiers,
        note,
      }
      items = [...state.items, newItem]
    }
    const totals = computeTotals(items, state.discount)
    set({ items, ...totals })
  },

  removeItem(localId) {
    const state = get()
    const items = state.items.filter(i => i.localId !== localId)
    set({ items, ...computeTotals(items, state.discount) })
  },

  updateQty(localId, qty) {
    const state = get()
    const items = qty <= 0
      ? state.items.filter(i => i.localId !== localId)
      : state.items.map(i => i.localId === localId ? { ...i, quantity: qty } : i)
    set({ items, ...computeTotals(items, state.discount) })
  },

  updateItem(localId, modifiers, note) {
    const state = get()
    const items = state.items.map(i =>
      i.localId === localId ? { ...i, modifiers, note } : i,
    )
    set({ items, ...computeTotals(items, state.discount) })
  },

  applyDiscount(discount) {
    set({ discount, ...computeTotals(get().items, discount) })
  },

  setCustomerName(customerName) {
    set({ customerName })
  },

  clearCart() {
    set({
      items: [],
      discount: null,
      customerName: '',
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,
      orderId: uuidv4(),
      editingOrder: null,
    })
  },

  regenerateOrderId() {
    set({ orderId: uuidv4() })
  },

  setEditingOrder(data) {
    set({ editingOrder: data })
  },

  clearEditingOrder() {
    set({ editingOrder: null })
  },

  parkCart() {
    const state = get()
    if (state.items.length === 0) return
    const parked: ParkedCart = {
      id: uuidv4(),
      customerName: state.customerName,
      items: state.items,
      discount: state.discount,
      subtotal: state.subtotal,
      discountAmount: state.discountAmount,
      totalAmount: state.totalAmount,
      parkedAt: new Date().toISOString(),
    }
    set({
      parkedCarts: [...state.parkedCarts, parked],
      items: [],
      discount: null,
      customerName: '',
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,
      orderId: uuidv4(),
    })
  },

  restoreCart(id) {
    const state = get()
    const target = state.parkedCarts.find(c => c.id === id)
    if (!target) return

    // If current cart has items, park it first
    let newParked = state.parkedCarts.filter(c => c.id !== id)
    if (state.items.length > 0) {
      newParked = [
        ...newParked,
        {
          id: uuidv4(),
          customerName: state.customerName,
          items: state.items,
          discount: state.discount,
          subtotal: state.subtotal,
          discountAmount: state.discountAmount,
          totalAmount: state.totalAmount,
          parkedAt: new Date().toISOString(),
        },
      ]
    }

    set({
      items: target.items,
      customerName: target.customerName,
      discount: target.discount,
      subtotal: target.subtotal,
      discountAmount: target.discountAmount,
      totalAmount: target.totalAmount,
      orderId: uuidv4(),
      parkedCarts: newParked,
    })
  },

  removeParked(id) {
    set(state => ({ parkedCarts: state.parkedCarts.filter(c => c.id !== id) }))
  },
}))
