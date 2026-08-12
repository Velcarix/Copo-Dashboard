import { useRef, useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { CopoLogo } from '@/shared/components/CopoLogo'
import { BranchSelector } from '@/shared/components/BranchSelector'
import { LicenseStatusBanner } from '@/shared/components/LicenseStatusBanner'
import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'
import { api } from '@/shared/lib/api'
import { EmployeeRole } from '@shared-types'

const ROLE_LABELS: Record<EmployeeRole, string> = {
  [EmployeeRole.OWNER]:   'Dueño',
  [EmployeeRole.ADMIN]:   'Admin',
  [EmployeeRole.CASHIER]: 'Cajero',
  [EmployeeRole.WAITER]:  'Mesero',
  [EmployeeRole.KITCHEN]: 'Cocina',
}

const BRANCH_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899']

function SwitchBranchDropdown() {
  const { availableBranches, branchId, updateAuthToken } = useAuthStore()
  const { setSelected } = useBranchStore()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  if (availableBranches.length <= 1) return null

  const current = availableBranches.find(b => b.id === branchId) ?? availableBranches[0]
  const currentIdx = availableBranches.findIndex(b => b.id === branchId)

  async function handleSwitch(targetId: string, role: EmployeeRole) {
    if (targetId === branchId) { setOpen(false); return }
    setSwitching(targetId)
    try {
      const res = await api.post<{ data: { accessToken: string } }>(
        '/api/v1/auth/switch-branch',
        { targetBranchId: targetId },
      )
      updateAuthToken(res.data.accessToken, targetId, role)
      setSelected(targetId)
    } finally {
      setSwitching(null)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative px-3 pt-2 pb-2 border-b border-[var(--color-border)]">
      <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5 px-1">
        Sesión activa
      </p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium w-full transition-colors',
          'border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-border)]',
          'text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        <span
          className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-white font-bold text-[10px]"
          style={{ background: BRANCH_COLORS[currentIdx >= 0 ? currentIdx : 0] }}
        >
          {current?.name.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 text-left truncate">{current?.name}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden">
          {availableBranches.map((branch, idx) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => handleSwitch(branch.id, branch.role)}
              disabled={switching !== null}
              className={[
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors text-left',
                branch.id === branchId
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'hover:bg-[var(--color-bg)] text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              <span
                className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-white font-bold text-[10px]"
                style={{ background: BRANCH_COLORS[idx % BRANCH_COLORS.length] }}
              >
                {branch.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{branch.name}</p>
                <p className={`text-[10px] ${branch.id === branchId ? 'opacity-75' : 'text-[var(--color-text-muted)]'}`}>
                  {ROLE_LABELS[branch.role] ?? branch.role}
                </p>
              </div>
              {switching === branch.id && (
                <span className="text-[10px] opacity-75">…</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
  comanderoOnly?: boolean
}

// SVG icon wrapper — consistent size
function Icon({ d, viewBox = '0 0 24 24' }: { d: string | string[]; viewBox?: string }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg width="16" height="16" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard', end: true, label: 'Inicio',
    icon: <Icon d={['M3 12L12 3l9 9', 'M5 10v10h5v-6h4v6h5V10']} />,
  },
  {
    to: '/dashboard/inventory', label: 'Inventario',
    icon: <Icon d={['M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z', 'M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z']} />,
  },
  {
    to: '/dashboard/products', label: 'Productos',
    icon: <Icon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />,
  },
  {
    to: '/dashboard/employees', label: 'Empleados',
    icon: <Icon d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75']} />,
  },
  {
    to: '/dashboard/reports', label: 'Reportes',
    icon: <Icon d={['M18 20V10', 'M12 20V4', 'M6 20v-6']} />,
  },
  {
    to: '/dashboard/orders', label: 'Órdenes',
    icon: <Icon d={['M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2', 'M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', 'M9 12h6', 'M9 16h4']} />,
  },
  {
    to: '/dashboard/shifts', label: 'Turnos',
    icon: <Icon d={['M12 2v4', 'M12 18v4', 'M4.93 4.93l2.83 2.83', 'M16.24 16.24l2.83 2.83', 'M2 12h4', 'M18 12h4', 'M4.93 19.07l2.83-2.83', 'M16.24 7.76l2.83-2.83']} />,
  },
  {
    to: '/dashboard/kitchen', label: 'Cocina',
    icon: <Icon d={['M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7z', 'M8 21h8', 'M12 19v2']} />,
  },
  {
    to: '/dashboard/roles', label: 'Roles',
    icon: <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']} />,
  },
  {
    to: '/dashboard/settings', label: 'Configuración',
    icon: <Icon d={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']} />,
  },
]

export function DashboardLayout() {
  const { logout, user, permissions } = useAuthStore()
  const hasComandero = permissions?.canAccessComandero ?? false
  const items = NAV_ITEMS.filter(item => !item.comanderoOnly || hasComandero)
  const [moreOpen, setMoreOpen] = useState(false)

  const PRIMARY_COUNT = 4
  const primaryItems = items.slice(0, PRIMARY_COUNT)
  const overflowItems = items.slice(PRIMARY_COUNT)
  const location = useLocation()
  const isOverflowActive = overflowItems.some(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  useEffect(() => { setMoreOpen(false) }, [location.pathname])

  return (
    <div className="flex flex-col h-dvh">
      <LicenseStatusBanner />
      <div className="flex flex-1 min-h-0 bg-[var(--color-bg)]">
      {/* ── Sidebar (desktop) ─── */}
      <aside className="hidden md:flex flex-col w-56 bg-[var(--color-surface)] border-r border-[var(--color-border)]">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <CopoLogo height={36} />
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Panel de control</p>
        </div>

        {/* Session branch switcher — only when employee has multiple branches */}
        <SwitchBranchDropdown />

        {/* Branch selector (data view filter) */}
        <div className="px-3 pt-3 pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5 px-1">Vista de datos</p>
          <BranchSelector />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => [
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] px-4 pt-3 pb-1 flex items-center justify-end">
          <ThemeToggle />
        </div>

        {user && (
          <p className="px-4 py-1 text-[10px] text-[var(--color-text-muted)] truncate">{user.name}</p>
        )}

        <button
          type="button"
          onClick={logout}
          className="mx-4 mb-4 mt-1 py-2 rounded-lg text-xs text-[var(--color-danger)] border border-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* ── Main area ─── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-2 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <span aria-hidden="true" className="font-display font-bold text-[var(--color-accent)] tracking-widest select-none shrink-0">
            {'C\u200bO\u200bP\u200bO'}
          </span>
          <div className="flex-1 min-w-0">
            <BranchSelector />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>

        {/* Mobile bottom nav — 4 primary items + "Más" for the rest */}
        <nav className="md:hidden flex border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
          {primaryItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) => [
                'flex-1 flex flex-col items-center gap-0.5 py-2 min-w-0 transition-colors',
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{item.label}</span>
            </NavLink>
          ))}
          {overflowItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="Más opciones"
              aria-expanded={moreOpen}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-2 min-w-0 transition-colors',
                moreOpen || isOverflowActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="shrink-0">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Más</span>
            </button>
          )}
        </nav>

        {/* Mobile "more" sheet — remaining nav items */}
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Más opciones">
            <div
              className="absolute inset-0 bg-black/40 animate-[fadeIn_150ms_ease-out]"
              onClick={() => setMoreOpen(false)}
            />
            <div className="absolute left-0 right-0 bottom-0 bg-[var(--color-surface)] rounded-t-2xl border-t border-[var(--color-border)] shadow-2xl pb-[calc(env(safe-area-inset-bottom)+0.5rem)] animate-[slideUp_180ms_ease-out]">
              <div className="flex items-center justify-center pt-2.5 pb-1">
                <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
              </div>
              <div className="flex items-center justify-between px-4 pb-2">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Más opciones</p>
                {user && <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[45%]">{user.name}</p>}
              </div>
              <SwitchBranchDropdown />
              <div className="grid grid-cols-3 gap-1 px-3 pb-2">
                {overflowItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => [
                      'flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 transition-colors',
                      isActive
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]',
                    ].join(' ')}
                  >
                    {item.icon}
                    <span className="text-[11px] font-medium leading-none text-center">{item.label}</span>
                  </NavLink>
                ))}
              </div>
              <div className="border-t border-[var(--color-border)] mt-1 px-4 py-3 flex items-center justify-between">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-medium text-[var(--color-danger)] px-3 py-1.5 rounded-lg border border-[var(--color-danger)]"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
