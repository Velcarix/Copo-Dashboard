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
// Cada update() incrementa el seq de su categoría — si la respuesta de un PUT
// llega después de que ya se disparó una edición más nueva, se descarta (evita
// que una respuesta tardía y obsoleta sobrescriba el valor más reciente).
const updateSeq = new Map<string, number>()

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

    const seq = (updateSeq.get(cat.id) ?? 0) + 1
    updateSeq.set(cat.id, seq)

    clearTimeout(updateTimers.get(cat.id))
    updateTimers.set(cat.id, setTimeout(() => {
      api.put<{ data: ApiCategory }>(`/api/v1/categories/${cat.id}`, {
        branchId,
        ...(patch.label !== undefined ? { name: patch.label } : {}),
        ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
        ...(patch.color !== undefined ? { color: