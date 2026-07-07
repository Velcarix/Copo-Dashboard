import { create } from 'zustand'
import { api, ApiError } from '@/shared/lib/api'
import { PricingMode } from '@shared-types'

export interface CategoryMeta {
  id: string
  key: string
  label: string
  emoji: string
  color: string
  sortOrder: number
  hidden: boolean
  pricingMode: PricingMode
  variantScheme?: string[]  // solo relevante si pricingMode === VARIANTS
}

interface ApiCategory {
  id: string
  key: string
  name: string
  emoji: string | null
  color: string | null
  sortOrder: number
  hidden: boolean
  pricingMode?: PricingMode | null
  variantScheme?: string[] | null
}

function fromApi(c: ApiCategory): CategoryMeta {
  return {
    id: c.id,
    key: c.key,
    label: c.name,
    emoji: c.emoji ?? '🏷️',
    color: c.color ?? '#6366f1',
    sortOrder: c.sortOrder,
    hidden: c.hidden,
    pricingMode: c.pricingMode ?? PricingMode.FIXED,
    variantScheme: c.variantScheme ?? undefined,
  }
}

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'No se pudo guardar — revisa tu conexión'
}

// DEV mock — mismas claves que ProductCategory (ProductsPage.MOCK_PRODUCTS las usa),
// una por cada pricingMode, para poder ver el feature completo sin backend.
const MOCK_CATEGORIES: CategoryMeta[] = [
  { id: 'cat-1', key: 'ICE_CREAM', label: 'Helados', emoji: '🍦', color: '#0ea5e9', sortOrder: 0, hidden: false, pricingMode: PricingMode.PRESENTATION },
  { id: 'cat-2', key: 'COFFEE', label: 'Cafés', emoji: '☕', color: '#92400e', sortOrder: 1, hidden: false, pricingMode: PricingMode.VARIANTS, variantScheme: ['Chico', 'Mediano', 'Grande'] },
  { id: 'cat-3', key: 'PASTRY', label: 'Pastelería', emoji: '🥐', color: '#f59e0b', sortOrder: 2, hidden: false, pricingMode: PricingMode.FIXED },
]

interface CategoryState {
  categories: CategoryMeta[]
  loaded: boolean
  branchId: string | null
  error: string | null
  load: (branchId: string) => Promise<void>
  update: (key: string, patch: Partial<Pick<CategoryMeta, 'label' | 'emoji' | 'color' | 'hidden' | 'pricingMode' | 'variantScheme'>>) => Promise<void>
  add: (cat: { key: string; label: string; emoji: string; color: string; hidden: boolean; pricingMode?: PricingMode; variantScheme?: string[] }) => Promise<boolean>
  remove: (key: string) => Promise<boolean>
  move: (key: string, direction: 'up' | 'down') => Promise<void>
  reset: () => Promise<void>
}

const updateTimers = new Map<string, ReturnType<typeof setTimeout>>()

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categories: [],
  loaded: false,
  branchId: null,
  error: null,

  async load(branchId) {
    set({ branchId })
    try {
      const res = await api.get<{ data: ApiCategory[] }>(`/api/v1/categories?branchId=${branchId}`)
      set({ categories: res.data.map(fromApi), loaded: true, error: null })
    } catch (err) {
      if (import.meta.env.DEV) {
        set({ categories: MOCK_CATEGORIES, loaded: true, error: null })
      } else {
        set({ loaded: true, error: errorMessage(err) })
      }
    }
  },

  async update(key, patch) {
    const { branchId, categories } = get()
    const cat = categories.find(c => c.key === key)
    if (!branchId || !cat) return

    // Optimistic update so typing in the label/color fields feels instant —
    // the actual PUT is debounced below to avoid one request per keystroke.
    set({ categories: get().categories.map(c => c.key === key ? { ...c, ...patch } : c) })

    clearTimeout(updateTimers.get(cat.id))
    updateTimers.set(cat.id, setTimeout(() => {
      api.put<{ data: ApiCategory }>(`/api/v1/categories/${cat.id}`, {
        branchId,
        ...(patch.label !== undefined ? { name: patch.label } : {}),
        ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.hidden !== undefined ? { hidden: patch.hidden } : {}),
        ...(patch.pricingMode !== undefined ? { pricingMode: patch.pricingMode } : {}),
        ...(patch.variantScheme !== undefined ? { variantScheme: patch.variantScheme } : {}),
      }).then(res => {
        set({ categories: get().categories.map(c => c.id === cat.id ? fromApi(res.data) : c), error: null })
      }).catch(async (err) => {
        // El PUT falló (red caída, backend abajo, etc.) — el cambio optimista quedaba
        // visible pero nunca se guardaba. Resincroniza con el server para no mentirle al usuario.
        set({ error: errorMessage(err) })
        await get().load(branchId)
      })
    }, 400))
  },

  async add(cat) {
    const { branchId } = get()
    if (!branchId) return false
    try {
      await api.post<{ data: ApiCategory }>('/api/v1/categories', {
        branchId,
        name: cat.label,
        emoji: cat.emoji,
        color: cat.color,
        pricingMode: cat.pricingMode ?? PricingMode.FIXED,
        ...(cat.variantScheme !== undefined ? { variantScheme: cat.variantScheme } : {}),
      })
      await get().load(branchId)
      set({ error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    }
  },

  async remove(key) {
    const { branchId, categories } = get()
    const cat = categories.find(c => c.key === key)
    if (!branchId || !cat) return false
    try {
      await api.delete(`/api/v1/categories/${cat.id}?branchId=${branchId}`)
      set({ categories: categories.filter(c => c.key !== key), error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    }
  },

  async move(key, direction) {
    const { branchId, categories } = get()
    if (!branchId) return
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(c => c.key === key)
    if (idx < 0) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= sorted.length) return
    ;[sorted[idx], sorted[target]] = [sorted[target], sorted[idx]]

    const orderedIds = sorted.map(c => c.id)
    try {
      const res = await api.put<{ data: ApiCategory[] }>('/api/v1/categories/reorder', { branchId, orderedIds })
      set({ categories: res.data.map(fromApi), error: null })
    } catch (err) {
      set({ error: errorMessage(err) })
    }
  },

  async reset() {
    const { branchId } = get()
    if (!branchId) return
    try {
      const res = await api.post<{ data: ApiCategory[] }>('/api/v1/categories/reset', { branchId })
      set({ categories: res.data.map(fromApi), error: null })
    } catch (err) {
      set({ error: errorMessage(err) })
    }
  },
}))

export function useSortedCategories(includeHidden = false) {
  return useCategoryStore(s =>
    s.categories
      .filter(c => includeHidden || !c.hidden)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )
}
