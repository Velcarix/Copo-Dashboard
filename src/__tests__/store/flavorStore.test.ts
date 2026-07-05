import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFlavorStore } from '@/shared/store/flavorStore'
import { api } from '@/shared/lib/api'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

beforeEach(() => {
  useFlavorStore.setState({ flavors: [], loaded: false, categoryId: null, error: null })
  vi.mocked(api.get).mockReset()
  vi.mocked(api.post).mockReset()
  vi.mocked(api.put).mockReset()
  vi.mocked(api.patch).mockReset()
  vi.mocked(api.delete).mockReset()
})

describe('flavorStore', () => {
  it('load() fetches and maps the flavor catalog for a category', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 'f1', name: 'Mango', priceDelta: 0, soldOut: false, active: true, sortOrder: 0 }],
    })
    await useFlavorStore.getState().load('cat1')
    expect(api.get).toHaveBeenCalledWith('/api/v1/categories/cat1/flavors')
    expect(useFlavorStore.getState().flavors).toEqual([
      { id: 'f1', name: 'Mango', priceDelta: 0, soldOut: false, active: true, sortOrder: 0 },
    ])
    expect(useFlavorStore.getState().loaded).toBe(true)
  })

  it('add() posts the new flavor and appends the server response', async () => {
    useFlavorStore.setState({ categoryId: 'cat1' })
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'f2', name: 'Pistache', priceDelta: 500, soldOut: false, active: true, sortOrder: 0 },
    })
    const ok = await useFlavorStore.getState().add({ name: 'Pistache', priceDelta: 500 })
    expect(ok).toBe(true)
    expect(api.post).toHaveBeenCalledWith('/api/v1/categories/cat1/flavors', { name: 'Pistache', priceDelta: 500, sortOrder: 0 })
    expect(useFlavorStore.getState().flavors).toHaveLength(1)
  })

  it('toggleSoldOut() flips the flag immediately (optimistic) and calls the sold-out endpoint', async () => {
    useFlavorStore.setState({
      categoryId: 'cat1',
      flavors: [{ id: 'f1', name: 'Mango', priceDelta: 0, soldOut: false, active: true, sortOrder: 0 }],
    })
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
    const promise = useFlavorStore.getState().toggleSoldOut('f1')
    // El flip debe verse antes de que resuelva la llamada de red (toggle instantáneo, sin debounce)
    expect(useFlavorStore.getState().flavors[0].soldOut).toBe(true)
    await promise
    expect(api.patch).toHaveBeenCalledWith('/api/v1/categories/cat1/flavors/f1/sold-out', { soldOut: true })
  })

  it('remove() drops the flavor from state on success', async () => {
    useFlavorStore.setState({
      categoryId: 'cat1',
      flavors: [{ id: 'f1', name: 'Mango', priceDelta: 0, soldOut: false, active: true, sortOrder: 0 }],
    })
    vi.mocked(api.delete).mockResolvedValue(undefined)
    const ok = await useFlavorStore.getState().remove('f1')
    expect(ok).toBe(true)
    expect(useFlavorStore.getState().flavors).toHaveLength(0)
  })
})
