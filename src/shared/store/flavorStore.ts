import { create } from 'zustand'
import { api, ApiError } from '@/shared/lib/api'
import type { CategoryFlavor } from '@shared-types'

interface ApiFlavor {
  id: string
  name: string
  priceDelta: number
  soldOut: boolean
  active: boolean
  sortOrder: number
}

function fromApi(f: ApiFlavor): CategoryFlavor {
  return {
    id: f.id,
    name: f.name,
    priceDelta: f.priceDelta,
    soldOut: f.soldOut,
    active: f.active,
    sortOrder: f.sortOrder,
  }
}

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'No se pudo guardar — revisa tu conexión'
}

interface CategoryFlavorSlice {
  flavors: CategoryFlavor[]
  loaded: boolean
  error: string | null
}

const EMPTY_SLICE: CategoryFlavorSlice = { flavors: [], loaded: false, error: null }

// Keyed by categoryId — el panel "Modos de cobro" puede montar varios
// FlavorManager a la vez (una por cada categoría PRESENTATION), así que el
// estado no puede vivir en un solo categoryId/flavors global: eso hacía que
// cada instancia se pisara con la otra en un loop infinito de renders.
interface FlavorState {
  byCategory: Record<string, CategoryFlavorSlice>
  load: (categoryId: string) => Promise<void>
  add: (categoryId: string, flavor: { name: string; priceDelta?: number }) => Promise<boolean>
  update: (categoryId: string, id: string, patch: Partial<Pick<CategoryFlavor, 'name' | 'priceDelta' | 'active' | 'sortOrder'>>) => Promise<void>
  toggleSoldOut: (categoryId: string, id: string) => Promise<void>
  remove: (categoryId: string, id: string) => Promise<boolean>
}

const updateTimers = new Map<string, ReturnType<typeof setTimeout>>()
// Cada update() incrementa el seq de su sabor — si la respuesta de un PUT
// llega después de que ya se disparó una edición más nueva, se descarta (evita
// que una respuesta tardía y obsoleta sobrescriba el valor más reciente).
const updateSeq = new Map<string, number>()

export const useFlavorStore = create<FlavorState>()((set, get) => ({
  byCategory: {},

  async load(categoryId) {
    set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...EMPTY_SLICE, ...s.byCategory[categoryId], loaded: false } } }))
    try {
      const res = await api.get<{ data: ApiFlavor[] }>(`/api/v1/categories/${categoryId}/flavors`)
      set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { flavors: res.data.map(fromApi), loaded: true, error: null } } }))
    } catch (err) {
      set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...(s.byCategory[categoryId] ?? EMPTY_SLICE), loaded: true, error: errorMessage(err) } } }))
    }
  },

  async add(categoryId, flavor) {
    const slice = get().byCategory[categoryId] ?? EMPTY_SLICE
    try {
      const res = await api.post<{ data: ApiFlavor }>(`/api/v1/categories/${categoryId}/flavors`, {
        name: flavor.name,
        priceDelta: flavor.priceDelta ?? 0,
        sortOrder: slice.flavors.length,
      })
      set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...slice, flavors: [...(s.byCategory[categoryId]?.flavors ?? slice.flavors), fromApi(res.data)], error: null } } }))
      return true
    } catch (err) {
      set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...slice, error: errorMessage(err) } } }))
      return false
    }
  },

  async update(categoryId, id, patch) {
    const slice = get().byCategory[categoryId]
    if (!slice) return
    // Optimistic update — se siente instantáneo mientras el dueño escribe; el PUT
    // real se debounce para no mandar una request por cada tecla.
    set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...slice, flavors: slice.flavors.map(f => f.id === id ? { ...f, ...patch } : f) } } }))

    const seq = (updateSeq.get(id) ?? 0) + 1
    updateSeq.set(id, seq)

    clearTimeout(updateTimers.get(id))
    updateTimers.set(id, setTimeout(() => {
      api.put<{ data: ApiFlavor }>(`/api/v1/categories/${categoryId}/flavors/${id}`, patch)
        .then(res => {
          if (updateSeq.get(id) !== seq) return // ya se disparó una edición más nueva — ignorar esta respuesta obsoleta
          set(s => {
            const current = s.byCategory[categoryId] ?? slice
            return { byCategory: { ...s.byCategory, [categoryId]: { ...current, flavors: current.flavors.map(f => f.id === id ? fromApi(res.data) : f), error: null } } }
          })
        })
        .catch(err => {
          if (updateSeq.get(id) !== seq) return
          // No se resincroniza con el server aquí: recargar flavors pisaba el
          // valor que el usuario seguía editando (revertía a la versión vieja).
          // Basta con avisar del error — el usuario decide si reintenta.
          set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...(s.byCategory[categoryId] ?? slice), error: errorMessage(err) } } }))
        })
    }, 400))
  },

  async toggleSoldOut(categoryId, id) {
    const slice = get().byCategory[categoryId]
    if (!slice) return
    const flavor = slice.flavors.find(f => f.id === id)
    if (!flavor) return
    const soldOut = !flavor.soldOut
    // Toggle "agotado hoy" no se debounce — el cajero/dueño espera que se sienta
    // inmediato, es un booleano operativo que se usa como toggle rápido.
    set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...slice, flavors: slice.flavors.map(f => f.id === id ? { ...f, soldOut } : f) } } }))
    try {
      await api.patch<{ data: ApiFlavor }>(`/api/v1/categories/${categoryId}/flavors/${id}/sold-out`, { soldOut })
    } catch (err) {
      set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...(s.byCategory[categoryId] ?? slice), error: errorMessage(err) } } }))
      await get().load(categoryId)
    }
  },

  async remove(categoryId, id) {
    const slice = get().byCategory[categoryId]
    if (!slice) return false
    try {
      await api.delete(`/api/v1/categories/${categoryId}/flavors/${id}`)
      set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...slice, flavors: slice.flavors.filter(f => f.id !== id), error: null } } }))
      return true
    } catch (err) {
      set(s => ({ byCategory: { ...s.byCategory, [categoryId]: { ...slice, error: errorMessage(err) } } }))
      return false
    }
  },
}))

export function useSortedFlavors(categoryId: string) {
  return useFlavorStore(s => {
    const flavors = s.byCategory[categoryId]?.flavors ?? EMPTY_SLICE.flavors
    return [...flavors].sort((a, b) => a.sortOrder - b.sortOrder)
  })
}
