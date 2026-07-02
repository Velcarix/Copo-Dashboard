import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initTheme } from './shared/lib/theme'

// Apply theme before first render to prevent flash
initTheme()

// DEV-only: pre-load mock owner so RouteGuard lets you browse without a backend
if (import.meta.env.DEV) {
  const { useAuthStore } = await import('./shared/store/authStore')
  const { EmployeeRole } = await import('@shared-types')
  useAuthStore.getState().setAuth(
    { id: 'dev-owner', name: 'Roberto García', role: EmployeeRole.OWNER },
    'dev-token',
    {
      role: EmployeeRole.OWNER,
      isShared: false,
      canAccessPOS: true,
      canAccessDashboard: true,
      canAccessComandero: true,   // plan incluyeccc
        // comandero
      canAccessKitchen: true,
      canManageTables: true,
      canAddTables: true,
      canApplyDiscounts: true,
      canCancelOrders: true,
      canViewReports: true,
      canManageInventory: true,
      canManageEmployees: true,
      canManageProducts: true,
      canIssueInvoices: true,
      canSkipShiftOpen: true,
      canSkipShiftClose: true,
    },
    'branch-1',
  )
  // NOTE: no setShift — mode selector routes to pos/shift/open if needed
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// El dashboard no es offline-first (a diferencia del POS que se eliminó del repo).
// Este registro solo existe para desinstalar el Service Worker en navegadores
// donde haya quedado instalado de una versión anterior — ver public/sw.js.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
