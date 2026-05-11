import { create } from 'zustand'
import { applyTheme, initTheme, storeTheme, type Theme } from '@/shared/lib/theme'
import { saveThemeToDB } from '@/shared/lib/db'

interface ThemeState {
  theme: Theme
  toggleTheme: () => Promise<void>
  setTheme: (t: Theme) => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initTheme(),

  async toggleTheme() {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    storeTheme(next)
    set({ theme: next })
    try { await saveThemeToDB(next) } catch { /* storage unavailable */ }
  },

  async setTheme(theme) {
    applyTheme(theme)
    storeTheme(theme)
    set({ theme })
    try { await saveThemeToDB(theme) } catch { /* storage unavailable */ }
  },
}))
