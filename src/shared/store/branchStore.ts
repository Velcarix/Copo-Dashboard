import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Branch {
  id: string
  name: string
  city: string
  address?: string
  isActive: boolean
  monthlyFixedCosts?: number
}

// DEV mock — replace with real fetch from /api/v1/branches once backend is ready
export const MOCK_BRANCHES: Branch[] = [
  { id: 'branch-1', name: 'Sucursal Centro',    city: 'Mérida',  address: 'Paseo de Montejo 123', isActive: true },
  { id: 'branch-2', name: 'Sucursal Altabrisa', city: 'Mérida',  address: 'Altabrisa 456',        isActive: true },
  { id: 'branch-3', name: 'Sucursal Cancún',    city: 'Cancún',  address: 'Av. Tulum 789',        isActive: true },
]

interface BranchState {
  branches: Branch[]
  selectedId: string | 'ALL'
  setBranches: (branches: Branch[]) => void
  setSelected: (id: string | 'ALL') => void
  /** Returns the selected Branch object, or null when "ALL" is active */
  selected: () => Branch | null
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      selectedId: 'ALL',
      setBranches: (branches) => set({ branches }),
      setSelected: (id) => set({ selectedId: id }),
      selected: () => {
        const { branches, selectedId } = get()
        if (selectedId === 'ALL') return null
        return branches.find(b => b.id === selectedId) ?? null
      },
    }),
    { name: 'copo-branch' },
  ),
)
