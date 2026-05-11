// frontend/src/__tests__/store/themeStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from '@/shared/store/themeStore'
import * as themeLib from '@/shared/lib/theme'
import * as dbModule from '@/shared/lib/db'

vi.mock('@/shared/lib/db', () => ({
  db: { settings: { put: vi.fn().mockResolvedValue(undefined) } },
  saveThemeToDB: vi.fn().mockResolvedValue(undefined),
  getThemeFromDB: vi.fn().mockResolvedValue(null),
}))

beforeEach(() => {
  vi.spyOn(themeLib, 'applyTheme').mockImplementation(() => {})
  vi.spyOn(themeLib, 'storeTheme').mockImplementation(() => {})
  vi.spyOn(themeLib, 'initTheme').mockReturnValue('light')
  vi.mocked(dbModule.saveThemeToDB).mockClear()
  useThemeStore.setState({ theme: 'light' })
})

describe('themeStore', () => {
  it('initial theme comes from initTheme()', () => {
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('toggleTheme switches light → dark', async () => {
    await useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(themeLib.applyTheme).toHaveBeenCalledWith('dark')
  })

  it('toggleTheme persists to Dexie', async () => {
    await useThemeStore.getState().toggleTheme()
    expect(dbModule.saveThemeToDB).toHaveBeenCalledWith('dark')
  })

  it('setTheme to dark applies and persists', async () => {
    await useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(dbModule.saveThemeToDB).toHaveBeenCalledWith('dark')
  })
})
