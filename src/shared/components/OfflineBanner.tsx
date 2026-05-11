import { useNetworkStore } from '@/shared/store/networkStore'

export function OfflineBanner() {
  const { isOnline, pendingSyncCount } = useNetworkStore()

  if (isOnline) return null

  return (
    <div
      role="alert"
      className="bg-[#78350F] text-[#FDE68A] text-center text-xs font-bold py-1.5 px-4 tracking-wide"
    >
      ⚠ Sin conexión
      {pendingSyncCount > 0 && ` — ${pendingSyncCount} venta${pendingSyncCount > 1 ? 's' : ''} guardada${pendingSyncCount > 1 ? 's' : ''}`}
    </div>
  )
}
