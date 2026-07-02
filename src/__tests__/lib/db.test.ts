// frontend/src/__tests__/lib/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, saveThemeToDB, getThemeFromDB } from '@/shared/lib/db'

describe('CopoDB', () => {
  beforeEach(async () => {
    await db.settings.clear()
  })

  it('stores and retrieves a theme setting', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' })
    const setting = await db.settings.get('theme')
    expect(setting?.value).toBe('dark')
  })

  it('saveThemeToDB / getThemeFromDB round-trip', async () => {
    await saveThemeToDB('dark')
    expect(await getThemeFromDB()).toBe('dark')
    await saveThemeToDB('light')
    expect(await getThemeFromDB()).toBe('light')
  })
})
