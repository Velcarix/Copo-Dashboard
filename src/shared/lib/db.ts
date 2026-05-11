import Dexie, { type Table } from 'dexie'
import type { CreateOrderDto } from '@shared-types'
import type { Theme } from './theme'

interface PendingOrder {
  localId: string           // UUID v4 — primary key
  branchId: string
  data: CreateOrderDto  // CreateOrderDto serializado
  createdAt: string         // ISO 8601
  synced: boolean
  syncedAt?: string
  conflictType?: 'inventory' | 'shift' | 'duplicate'
}

interface CachedProduct {
  id: string
  branchId: string
  category: string
  active: boolean
  data: Record<string, unknown>  // Product + modifierGroups
  cachedAt: string
}

interface CurrentShift {
  id: string
  branchId: string
  employeeId: string
  openedAt: string
  openingCash: number
  pendingSync: boolean
}

interface EmployeePin {
  id: string
  branchId: string
  pinHash: string           // bcrypt hash
  name: string
  role: string
  syncedAt: string
}

interface Setting {
  key: string               // primary key
  value: string
}

class CopoDB extends Dexie {
  pendingOrders!: Table<PendingOrder, string>
  products!: Table<CachedProduct, string>
  currentShift!: Table<CurrentShift, string>
  employeePins!: Table<EmployeePin, string>
  settings!: Table<Setting, string>

  constructor() {
    super('CopoDB')
    this.version(1).stores({
      pendingOrders:  'localId, branchId, synced, createdAt',
      products:       'id, branchId, category, active',
      currentShift:   'id, branchId',
      employeePins:   'id, branchId',
      settings:       'key',
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

export async function getPendingSyncCount(): Promise<number> {
  // Use filter() for boolean field — more portable across IndexedDB implementations
  return db.pendingOrders.filter(o => !o.synced).count()
}
