import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock api and db before importing posStore so the module-level
// VITE_API_URL guard in api.ts never executes during tests.
vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/shared/lib/db', () => ({
  db: {
    products: {
      bulkPut: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({ toArray: vi.fn(async () => []) })),
        })),
      })),
    },
  },
}))

import { usePosStore, selectFilteredProducts } from '@/shared/store/posStore'
import type { ModifierGroupConfig } from '@shared-types'
import { ProductCategory } from '@shared-types'

const makeProduct = (id: string, name: string, category: string) => ({
  id,
  name,
  category,
  basePrice: 3500,
  imageUrl: null,
  active: true,
  modifierGroups: [] as ModifierGroupConfig[],
})

beforeEach(() => {
  usePosStore.setState({
    activeCategory: 'ALL',
    searchQuery: '',
    products: [],
  })
})

describe('selectFilteredProducts', () => {
  it('returns all products when category is ALL', () => {
    const products = [
      makeProduct('1', 'Vainilla', ProductCategory.ICE_CREAM),
      makeProduct('2', 'Americano', ProductCategory.COFFEE),
    ]
    usePosStore.setState({ products })
    expect(selectFilteredProducts(usePosStore.getState())).toHaveLength(2)
  })

  it('filters by activeCategory', () => {
    const products = [
      makeProduct('1', 'Vainilla', ProductCategory.ICE_CREAM),
      makeProduct('2', 'Americano', ProductCategory.COFFEE),
    ]
    usePosStore.setState({ products, activeCategory: ProductCategory.ICE_CREAM })
    expect(selectFilteredProducts(usePosStore.getState())).toHaveLength(1)
    expect(selectFilteredProducts(usePosStore.getState())[0].name).toBe('Vainilla')
  })

  it('filters by searchQuery case-insensitive', () => {
    const products = [
      makeProduct('1', 'Vainilla', ProductCategory.ICE_CREAM),
      makeProduct('2', 'Americano', ProductCategory.COFFEE),
    ]
    usePosStore.setState({ products, searchQuery: 'vain' })
    expect(selectFilteredProducts(usePosStore.getState())).toHaveLength(1)
  })

  it('returns empty array when no match', () => {
    const products = [makeProduct('1', 'Vainilla', ProductCategory.ICE_CREAM)]
    usePosStore.setState({ products, searchQuery: 'zzz' })
    expect(selectFilteredProducts(usePosStore.getState())).toHaveLength(0)
  })
})
