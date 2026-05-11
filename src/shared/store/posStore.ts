import { create } from 'zustand'
import type { ModifierGroupConfig } from '@shared-types'
import { api } from '@/shared/lib/api'
import { db } from '@/shared/lib/db'

export interface ProductWithModifiers {
  id: string
  name: string
  category: string
  basePrice: number       // centavos
  imageUrl: string | null
  active: boolean
  modifierGroups: ModifierGroupConfig[]
}

interface PosState {
  activeCategory: string
  searchQuery: string
  products: ProductWithModifiers[]
  isLoading: boolean
  fetchError: string | null
  soldOutIds: string[]
  setCategory: (cat: string) => void
  setSearch: (q: string) => void
  setProducts: (products: ProductWithModifiers[]) => void
  refreshProducts: (branchId: string) => Promise<void>
  toggleSoldOut: (productId: string) => void
}

export const usePosStore = create<PosState>((set, get) => ({
  activeCategory: 'ALL',
  searchQuery: '',
  products: [],
  isLoading: false,
  fetchError: null,
  soldOutIds: [],

  setCategory: (activeCategory) => set({ activeCategory }),
  setSearch: (searchQuery) => set({ searchQuery }),
  setProducts: (products) => set({ products }),
  toggleSoldOut: (productId) => {
    const { soldOutIds } = get()
    set({
      soldOutIds: soldOutIds.includes(productId)
        ? soldOutIds.filter(id => id !== productId)
        : [...soldOutIds, productId],
    })
  },

  async refreshProducts(branchId) {
    // Demo mode: skip API and Dexie, load mock catalog immediately
    if (import.meta.env.VITE_DEMO === 'true') {
      const { MOCK_PRODUCTS } = await import('../lib/mockProducts')
      set({ products: MOCK_PRODUCTS, isLoading: false })
      return
    }

    set({ isLoading: true, fetchError: null })
    try {
      const res = await api.get<{ data: ProductWithModifiers[] }>(
        `/api/v1/products?branchId=${branchId}&active=true`,
      )
      const products = res.data
      await db.products.bulkPut(
        products.map(p => ({
          id: p.id,
          branchId,
          category: p.category,
          active: p.active,
          // Safe: data is written and read exclusively by this module, so the
          // structural shape is guaranteed to match ProductWithModifiers at runtime.
          data: p as unknown as Record<string, unknown>,
          cachedAt: new Date().toISOString(),
        })),
      )
      set({ products })
    } catch {
      // API failed — attempt to serve from the local Dexie cache.
      try {
        const cached = await db.products
          .where('branchId').equals(branchId)
          .filter(p => p.active)
          .toArray()
        // Safe: every row was written by the bulkPut above, so `data` always
        // contains a serialized ProductWithModifiers.
        const products = cached.map(c => c.data as unknown as ProductWithModifiers)
        if (products.length > 0) {
          set({ products })
        } else if (import.meta.env.DEV) {
          const { MOCK_PRODUCTS } = await import('../lib/mockProducts')
          set({ products: MOCK_PRODUCTS })
        } else {
          set({ fetchError: 'No se pudo cargar el catálogo' })
        }
      } catch {
        set({ fetchError: 'No se pudo cargar el catálogo' })
      }
    } finally {
      set({ isLoading: false })
    }
  },
}))

export function selectFilteredProducts(state: PosState): ProductWithModifiers[] {
  let products = state.products.filter(p => p.active)
  if (state.activeCategory !== 'ALL') {
    products = products.filter(p => p.category === state.activeCategory)
  }
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase()
    products = products.filter(p => p.name.toLowerCase().includes(q))
  }
  return products
}
