import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { OfflineBanner } from '@/shared/components/OfflineBanner'
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'

export function POSLayout() {
  useNetworkStatus()
  return (
    <div className="flex flex-col h-dvh bg-[var(--color-bg)]">
      <OfflineBanner />
      <header className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        <span className="font-display font-bold text-[var(--color-accent)] tracking-widest text-base">COPO</span>
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
