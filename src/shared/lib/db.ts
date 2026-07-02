import Dexie, { type Table } from 'dexie'
import type { Theme } from './theme'

interface Setting {
  key: string               // primary key
  value: string
}

class CopoDB extends Dexie {
  settings!: Table<Setting, string>

  constructor() {
    super('CopoDB')
    this.version(1).stores({
      settings: 'key',
    })
  }
}

export const db = new CopoDB()

// Helpers
export async function getThemeFromDB(): Promise<Theme | null> {
  const setting = await db.settings.get('theme')
  if (setting?.value === 'light' || setting?.value === 'dark') {
    return setting.value
  }
  return null
}

export async function saveThemeToDB(theme: Theme): Promise<void> {
  await db.settings.put({ key: 'theme', value: theme })
}
