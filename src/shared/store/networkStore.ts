import { create } from 'zustand'

interface NetworkState {
  isOnline: boolean
  pendingSyncCount: number
  setOnline: (v: boolean) => void
  setPendingCount: (n: number) => void
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: navigator.onLine,
  pendingSyncCount: 0,
  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingSyncCount) => set({ pendingSyncCount }),
}))
