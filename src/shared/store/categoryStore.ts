import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ProductCategory } from '@shared-types'

export interface CategoryMeta {
  key: string
  label: string
  emoji: string
  color: string
  sortOrder: number
  hidden: boolean
}

export const CATEGORY_DEFAULTS: CategoryMeta[] = [
  { key: ProductCategory.ICE_CREAM, label: 'Helados',  emoji: '🍦', color: '#6366f1', sortOrder: 0, hidden: false },
  { key: ProductCategory.COFFEE,    label: 'Cafés',    emoji: '☕',  color: '#92400e', sortOrder: 1, hidden: false },
  { key: ProductCategory.BEVERAGE,  label: 'Bebidas',  emoji: '🥤',  color: '#0ea5e9', sortOrder: 2, hidden: false },
  { key: ProductCategory.PASTRY,    label: 'Pasteles', emoji: '🥐',  color: '#d97706', sortOrder: 3, hidden: false },
  { key: ProductCategory.SNACK,     label: 'Snacks',   emoji: '🍿',  color: '#16a34a', sortOrder: 4, hidden: false },
  { key: ProductCategory.COMBO,     label: 'Combos',   emoji: '🎁',  color: '#7c3aed', sortOrder: 5, hidden: false },
  { key: ProductCategory.EXTRA,     label: 'Extras',   emoji: '➕',  color: '#6b7280', sortOrder: 6, hidden: false },
]

interface CategoryState {
  categories: CategoryMeta[]
  update: (key: string, patch: Partial<Omit<CategoryMeta, 'key'>>) => void
  add: (cat: Omit<CategoryMeta, 'sortOrder'>) => void
  remove: (key: string) => void
  move: (key: string, direction: 'up' | 'down') => void
  reset: () => void
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: CATEGORY_DEFAULTS,

      update(key, patch) {
        set({
          categories: get().categories.map(c => c.key === key ? { ...c, ...patch } : c),
        })
      },

      add(cat) {
        const cats = get().categories
        set({ categories: [...cats, { ...cat, sortOrder: cats.length }] })
      },

      remove(key) {
        const isDefault = CATEGORY_DEFAULTS.some(c => c.key === key)
        if (isDefault) return
        const filtered = get().categories.filter(c => c.key !== key)
        set({ categories: filtered.map((c, i) => ({ ...c, sortOrder: i })) })
      },

      move(key, direction) {
        const cats = [...get().categories].sort((a, b) => a.sortOrder - b.sortOrder)
        const idx = cats.findIndex(c => c.key === key)
        if (idx < 0) return
        const target = direction === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= cats.length) return
        ;[cats[idx], cats[target]] = [cats[target], cats[idx]]
        set({ categories: cats.map((c, i) => ({ ...c, sortOrder: i })) })
      },

      reset() {
        set({ categories: CATEGORY_DEFAULTS })
      },
    }),
    { name: 'copo-categories' },
  ),
)

export function useSortedCategories(includeHidden = false) {
  return useCategoryStore(s =>
    s.categories
      .filter(c => includeHidden || !c.hidden)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )
}
