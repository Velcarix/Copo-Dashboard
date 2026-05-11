// frontend/src/__tests__/lib/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, getPendingSyncCount, saveThemeToDB, getThemeFromDB } from '@/shared/lib/db'
import type { CreateOrderDto } from '@shared-types'
import { PaymentMethod } from '@shared-types'

function makeOrderDto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
  return {
    id: 'order-uuid',
    branchId: 'branch-1',
    employeeId: 'emp-1',
    shiftId: 'shift-1',
    paymentMethod: PaymentMethod.CASH,
    items: [],
    totalAmount: 3500,
    ...overrides,
  }
}

describe('CopoDB', () => {
  beforeEach(async () => {
    await db.pendingOrders.clear()
    await db.settings.clear()
  })

  it('stores and retrieves a pending order', async () => {
    const order = {
      localId: 'test-uuid-1',
      branchId: 'branch-1',
      data: makeOrderDto({ totalAmount: 3500 }),
      createdAt: new Date().toISOString(),
      synced: false,
    }
    await db.pendingOrders.add(order)
    const stored = await db.pendingOrders.get('test-uuid-1')
    expect(stored?.data.totalAmount).toBe(3500)
    expect(stored?.synced).toBe(false)
  })

  it('stores and retrieves a theme setting', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' })
    const setting = await db.settings.get('theme')
    expect(setting?.value).toBe('dark')
  })

  it('saveThemeToDB / getThemeFromDB round-trip', async () => {
    await saveThemeToDB('dark')
    expect(await getThemeFromDB()).toBe('dark')
    await saveThemeToDB('light')
    expect(await getThemeFromDB()).toBe('light')
  })

  it('getPendingSyncCount counts unsynced orders', async () => {
    const now = new Date().toISOString()
    await db.pendingOrders.bulkAdd([
      { localId: 'o1', branchId: 'b1', data: makeOrderDto(), createdAt: now, synced: false },
      { localId: 'o2', branchId: 'b1', data: makeOrderDto(), createdAt: now, synced: false },
      { localId: 'o3', branchId: 'b1', data: makeOrderDto(), createdAt: now, synced: true },
    ])
    expect(await getPendingSyncCount()).toBe(2)
  })
})
