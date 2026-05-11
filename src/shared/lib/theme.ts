export type Theme = 'light' | 'dark'

// NOTE: localStorage is used intentionally here for synchronous pre-render access only.
// Dexie (IndexedDB) is async and cannot be read before the first React render without
// causing a theme flash. The themeStore (Zustand) persists to Dexie after first render
// via saveThemeToDB. localStorage acts only as a fast init cache; Dexie is the source of truth.
const THEME_KEY = 'copo-theme'

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return null
  } catch {
    return null
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // storage unavailable
  }
}

export function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function initTheme(): Theme {
  const theme = getStoredTheme() ?? getSystemTheme()
  applyTheme(theme)
  return theme
}
