import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCategoryStore } from '@/shared/store/categoryStore'
import { api } from '@/shared/lib/api'
import { PricingMode } from '@shared-types'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

const baseCat = {
  id: 'c1', key: 'ICE_CREAM', label: 'Helados', emoji: '🍦', color: '#0ea5e9',
  sortOrder: 0, hidden: false, pricingMode: PricingMode.FIXED,
}

beforeEach(() => {
  useCategoryStore.setState({ categories: [baseCat], loaded: true, branchId: 'b1', error: null })
  vi.mocked(api.get).mockReset()
  vi.mocked(api.post).mockReset()
  vi.mocked(api.put).mockReset()
  vi.mocked(api.delete).mockReset()
  vi.useFakeTimers()
})

describe('categoryStore.update()', () => {
  it('does not let a slower, superseded PUT response overwrite a newer edit (out-of-order network race)', async () => {
    let resolveFirst!: (v: unknown) => void
    let resolveSecond!: (v: unknown) => void
    const firstPut = new Promise(res => { resolveFirst = res })
    const secondPut = new Promise(res => { resolveSecond = res })
    vi.mocked(api.put).mockReturnValueOnce(firstPut as never).mockReturnValueOnce(secondPut as never)

    // User deletes part of the name, pauses long enough for the debounce to fire (first request in flight)...
    useCategoryStore.getState().update('ICE_CREAM', { label: 'Helad' })
    await vi.advanceTimersByTimeAsync(400)
    expect(api.put).toHaveBeenCalledTimes(1)

    // ...then keeps deleting until the field is fully cleared (second request in flight).
    useCategoryStore.getState().update('ICE_CREAM', { label: '' })
    await vi.advanceTimersByTimeAsync(400)
    expect(api.put).toHaveBeenCalledTimes(2)

    // The second (latest) request's response comes back first...
    resolveSecond({ data: { ...baseCat, name: '' } })
    await Promise.resolve()
    await Promise.resolve()
    expect(useCategoryStore.getState().categories[0].label).toBe('')

    // ...but the first (stale) request's response arrives late. It must NOT clobber the newer state.
    resolveFirst({ data: { ...baseCat, name: 'Helad' } })
    await Promise.resolve()
    await Promise.resolve()
    expect(useCategoryStore.getState().categories[0].label).toBe('')
  })
})
