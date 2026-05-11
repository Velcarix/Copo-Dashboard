import { Outlet, NavLink, Link } from 'react-router-dom'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { BranchSelector } from '@/shared/components/BranchSelector'
import { useAuthStore } from '@/shared/store/authStore'

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
    to: '/dashboard/branches', label: 'Sucursales',
    icon: <Icon d={['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} />,
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
    to: '/dashboard/invoices', label: 'Facturas',
    icon: <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']} />,
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

  return (
    <div className="flex h-dvh bg-[var(--color-bg)]">
      {/* ── Sidebar (desktop) ─── */}
      <aside className="hidden md:flex flex-col w-56 bg-[var(--color-surface)] border-r border-[var(--color-border)]">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <span className="font-display font-bold text-xl text-[var(--color-accent)] tracking-widest">COPO</span>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Panel de control</p>
        </div>

        {/* Branch selector */}
        <div className="px-3 pt-3 pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5 px-1">Sucursal</p>
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

        {/* Mobile bottom nav — max 5 items */}
        <nav className="md:hidden flex border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {items.slice(0, 5).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) => [
                'flex-1 flex flex-col items-center py-2.5 transition-colors',
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
