import { describe, expect, it } from 'vitest'
import { toHistoryOrder, type ApiOrder } from '@/apps/dashboard/pages/OrderHistoryPage'
import { discountsNote } from '@/apps/dashboard/pages/DashboardHome'

const base: ApiOrder = {
  id: 'o-1', orderNumber: 7, createdAt: '2026-09-24T12:00:00.000Z', totalAmount: 7300,
  status: 'COMPLETED', paymentMethod: 'CASH', isEdited: false, employeeName: 'Ana',
  items: [
    { productId: 'cafe', name: 'Café', quantity: 2, unitPrice: 4000, lineTotal: 9000 },
  ],
}

describe('toHistoryOrder — desglose de descuentos', () => {
  it('separa el descuento del cajero de los premios de Loyalty', () => {
    const order = toHistoryOrder({
      ...base,
      subtotal: 9000, discountAmount: 1700, loyaltyDiscountAmount: 1200,
      loyaltyRewards: [{ name: '20% en bebidas', amount: 1200 }, { name: 'Café gratis', amount: 0 }],
    })
    expect(order.subtotal).toBe(9000)
    expect(order.manualDiscount).toBe(500)
    expect(order.loyaltyDiscount).toBe(1200)
    expect(order.loyaltyRewards).toHaveLength(2)
    // Subtotal − descuentos = total: ya no hay diferencia sin explicar.
    expect(order.subtotal - order.manualDiscount - order.loyaltyDiscount + order.tip).toBe(order.total)
  })

  it('usa el precio de la línea con extras (lineTotal), no solo unitPrice × cantidad', () => {
    expect(toHistoryOrder(base).items[0].lineTotal).toBe(9000)
    const legacy = toHistoryOrder({ ...base, items: [{ productId: 'cafe', name: 'Café', quantity: 2, unitPrice: 4000 }] })
    expect(legacy.items[0].lineTotal).toBe(8000)
  })

  it('con un backend viejo (sin desglose) todo queda en 0 y el subtotal sale de los productos', () => {
    const order = toHistoryOrder(base)
    expect(order.manualDiscount).toBe(0)
    expect(order.loyaltyDiscount).toBe(0)
    expect(order.loyaltyRewards).toEqual([])
    expect(order.subtotal).toBe(9000)
  })
})

describe('discountsNote', () => {
  it('explica que Ventas ya trae los descuentos restados', () => {
    const note = discountsNote({ manual: 5000, loyalty: 12000 })
    expect(note).toMatch(/^Ventas ya descuenta/)
    expect(note).toMatch(/en premios de Copo Loyalty y .* en descuentos del cajero/)
    expect(note).toMatch(/precio de lista/)
  })

  it('omite la parte que no hubo', () => {
    expect(discountsNote({ manual: 0, loyalty: 12000 })).not.toMatch(/cajero/)
    expect(discountsNote({ manual: 5000, loyalty: 0 })).not.toMatch(/Loyalty/)
  })
})
