import { useEffect } from 'react'
import { useNetworkStore } from '@/shared/store/networkStore'
import { getPendingSyncCount } from '@/shared/lib/db'
import { syncPendingOrders } from '@/shared/lib/sync'

const HEALTH_CHECK_URL = `${import.meta.env.VITE_API_URL}/api/v1/health`
const HEALTH_CHECK_INTERVAL = 30_000

async function checkRealConnectivity(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

export function useNetworkStatus(): void {
  const { setOnline, setPendingCount } = useNetworkStore()

  useEffect(() => {
    async function updateStatus() {
      const online = navigator.onLine ? await checkRealConnectivity() : false
      setOnline(online)
      const pending = await getPendingSyncCount()
      setPendingCount(pending)
    }

    updateStatus()

    const handleOnline = () => { updateStatus(); syncPendingOrders() }
    const handleOffline = () => { setOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(updateStatus, HEALTH_CHECK_INTERVAL)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [setOnline, setPendingCount])
}
