import { db } from './db'
import { api } from './api'
import { useNetworkStore } from '@/shared/store/networkStore'
import type { BulkSyncResponse } from '@shared-types'

export async function syncPendingOrders(): Promise<void> {
  const unsynced = await db.pendingOrders.filter(o => !o.synced).toArray()
  if (unsynced.length === 0) return

  const orders = unsynced.map(o => ({
    ...o.data,
    id: o.localId,
    createdAt: o.createdAt,
  }))

  try {
    const res = await api.post<BulkSyncResponse>('/api/v1/orders/bulk-sync', { orders })
    for (const result of res.results) {
      try {
        if (result.status === 'ok' || result.status === 'duplicate') {
          await db.pendingOrders.update(result.tempId, {
            synced: true,
            syncedAt: new Date().toISOString(),
          })
        } else if (result.status === 'conflict') {
          await db.pendingOrders.update(result.tempId, { conflictType: 'inventory' })
        }
        // 'failed' status: record stays unsynced, will retry on next sync
      } catch {
        // Individual write failure — will reconcile on next sync
      }
    }
  } catch {
    // Will retry next time online
  }

  const pendingCount = await db.pendingOrders.filter(o => !o.synced).count()
  useNetworkStore.getState().setPendingCount(pendingCount)
}
