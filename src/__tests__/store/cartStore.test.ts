// frontend/src/__tests__/store/cartStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/shared/store/cartStore'
import { DiscountType } from '@shared-types'
import type { CartItemModifier } from '@shared-types'

beforeEach(() => {
  useCartStore.setState({
    items: [],
    orderId: 'test-order-uuid',
    discount: null,
  })
})

describe('cartStore', () => {
  it('adds an item to the cart', () => {
    useCartStore.getState().addItem(
      { id: 'p1', name: 'Vainilla', basePrice: 3500 },
      [],
    )
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].productName).toBe('Vainilla')
  })

  it('increments quantity when adding same product with same modifiers', () => {
    const mods: CartItemModifier[] = []
    useCartStore.getState().addItem({ id: 'p1', name: 'Vainilla', basePrice: 3500 }, mods)
    useCartStore.getState().addItem({ id: 'p1', name: 'Vainilla', basePrice: 3500 }, mods)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('creates separate items when same product has different modifiers', () => {
    useCartStore.getState().addItem(
      { id: 'p1', name: 'Americano', basePrice: 3500 },
      [{ optionId: 'opt1', optionName: 'Grande', priceDelta: 1000 }],
    )
    useCartStore.getState().addItem(
      { id: 'p1', name: 'Americano', basePrice: 3500 },
      [{ optionId: 'opt2', optionName: 'Chico', priceDelta: 0 }],
    )
    expect(useCartStore.getState().items).toHaveLength(2)
  })

  it('calculates totalAmount correctly', () => {
    useCartStore.getState().addItem(
      { id: 'p1', name: 'Café', basePrice: 3500 },
      [{ optionId: 'o1', optionName: 'Grande', priceDelta: 1000 }],
    )
    // (3500 + 1000) * 1 = 4500
    expect(useCartStore.getState().totalAmount).toBe(4500)
  })

  it('applies fixed discount', () => {
    useCartStore.getState().addItem({ id: 'p1', name: 'Café', basePrice: 5000 }, [])
    useCartStore.getState().applyDiscount({ type: DiscountType.FIXED, value: 1000, reason: 'Cortesía' })
    expect(useCartStore.getState().discountAmount).toBe(1000)
    expect(useCartStore.getState().totalAmount).toBe(4000)
  })

  it('applies percent discount', () => {
    useCartStore.getState().addItem({ id: 'p1', name: 'Café', basePrice: 10000 }, [])
    useCartStore.getState().applyDiscount({ type: DiscountType.PERCENT, value: 10, reason: 'Promo' })
    expect(useCartStore.getState().discountAmount).toBe(1000)
    expect(useCartStore.getState().totalAmount).toBe(9000)
  })

  it('clears cart and regenerates orderId', () => {
    useCartStore.getState().addItem({ id: 'p1', name: 'Café', basePrice: 3500 }, [])
    const oldOrderId = useCartStore.getState().orderId
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().orderId).not.toBe(oldOrderId)
  })
})
