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

interface FlavorState {
  flavors: CategoryFlavor[]
  loaded: boolean
  categoryId: string | null
  error: string | null
  load: (categoryId: string) => Promise<void>
  add: (flavor: { name: string; priceDelta?: number }) => Promise<boolean>
  update: (id: string, patch: Partial<Pick<CategoryFlavor, 'name' | 'priceDelta' | 'active' | 'sortOrder'>>) => Promise<void>
  toggleSoldOut: (id: string) => Promise<void>
  remove: (id: string) => Promise<boolean>
}

const updateTimers = new Map<string, ReturnType<typeof setTimeout>>()
// Cada update() incrementa el seq de su sabor — si la respuesta de un PUT
// llega después de que ya se disparó una edición más nueva, se descarta (evita
// que una respuesta tardía y obsoleta sobrescriba el valor más reciente).
const updateSeq = new Map<string, number>()

export const useFlavorStore = create<FlavorState>()((set, get) => ({
  flavors: [],
  loaded: false,
  categoryId: null,
  error: null,

  async load(categoryId) {
    set({ categoryId, loaded: false })
    try {
      const res = await api.get<{ data: ApiFlavor[] }>(`/api/v1/categories/${categoryId}/flavors`)
      set({ flavors: res.data.map(fromApi), loaded: true, error: null })
    } catch (err) {
      set({ loaded: true, error: errorMessage(err) })
    }
  },

  async add(flavor) {
    const { categoryId } = get()
    if (!categoryId) return false
    try {
      const res = await api.post<{ data: ApiFlavor }>(`/api/v1/categories/${categoryId}/flavors`, {
        name: flavor.name,
        priceDelta: flavor.priceDelta ?? 0,
        sortOrder: get().flavors.length,
      })
      set({ flavors: [...get().flavors, fromApi(res.data)], error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    }
  },

  async update(id, patch) {
    const { categoryId, flavors } = get()
    if (!categoryId) return
    // Optimistic update — se siente instantáneo mientras el dueño escribe; el PUT
    // real se debounce para no mandar una request por cada tecla.
    set({ flavors: flavors.map(f => f.id === id ? { ...f, ...patch } : f) })

    const seq = (updateSeq.get(id) ?? 0) + 1
    updateSeq.set(id, seq)

    clearTimeout(updateTimers.get(id))
    updateTimers.set(id, setTimeout(() => {
      api.put<{ data: ApiFlavor }>(`/api/v1/categories/${categoryId}/flavors/${id}`, patch)
        .then(res => {
          if (updateSeq.get(id) !== seq) return // ya se disparó una edición más nueva — ignorar esta respuesta obsoleta
          set({ flavors: get().flavors.map(f => f.id === id ? fromApi(res.data) : f), error: null })
        })
        .catch(async err => {
          if (updateSeq.get(id) !== seq) return
          set({ error: errorMessage(err) })
          await get().load(categoryId)
        })
    }, 400))
  },

  async toggleSoldOut(id) {
    const { categoryId, flavors } = get()
    if (!categoryId) return
    const flavor = flavors.find(f => f.id === id)
    if (!flavor) return
    const soldOut = !flavor.soldOut
    // Toggle "agotado hoy" no se debounce — el cajero/dueño espera que se sienta
    // inmediato, es un booleano operativo que se usa como toggle rápido.
    set({ flavors: flavors.map(f => f.id === id ? { ...f, soldOut } : f) })
    try {
      await api.patch<{ data: ApiFlavor }>(`/api/v1/categories/${categoryId}/flavors/${id}/sold-out`, { soldOut })
    } catch (err) {
      set({ error: errorMessage(err) })
      await get().load(categoryId)
    }
  },

  async remove(id) {
    const { categoryId, flavors } = get()
    if (!categoryId) return false
    try {
      await api.delete(`/api/v1/categories/${categoryId}/flavors/${id}`)
      set({ flavors: flavors.filter(f => f.id !== id), error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    }
  },
}))

export function useSortedFlavors() {
  return useFlavorStore(s => [...s.flavors].sort((a, b) => a.sortOrder - b.sortOrder))
}
