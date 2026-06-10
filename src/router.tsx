// createHashRouter is used so the same build works in:
//   - Web / PWA (https://app.copo.mx/#/dashboard)
//   - Electron  (file://dist/index.html#/pos)
//   - Capacitor (capacitor://localhost#/dashboard)
import { createHashRouter, Navigate } from 'react-router-dom'
import { EmployeeRole } from '@shared-types'
import { RouteGuard } from '@/shared/components/RouteGuard'
import { LoginPage } from '@/apps/auth/LoginPage'
import { PinPage } from '@/apps/auth/PinPage'
import { POSLayout } from '@/apps/pos/layout/POSLayout'
import { POSMain } from '@/apps/pos/pages/POSMain'
import { ShiftOpen } from '@/apps/pos/pages/ShiftOpen'
import { ShiftClose } from '@/apps/pos/pages/ShiftClose'
import { OrderHistoryPage } from '@/apps/pos/pages/OrderHistoryPage'

import { DashboardLayout } from '@/apps/dashboard/layout/DashboardLayout'
import { DashboardHome } from '@/apps/dashboard/pages/DashboardHome'
import { InventoryPage } from '@/apps/dashboard/pages/InventoryPage'
import { ProductsPage } from '@/apps/dashboard/pages/ProductsPage'
import { EmployeesPage } from '@/apps/dashboard/pages/EmployeesPage'
import { ReportsPage } from '@/apps/dashboard/pages/ReportsPage'
import { BranchesPage } from '@/apps/dashboard/pages/BranchesPage'
import { SettingsPage } from '@/apps/dashboard/pages/SettingsPage'
import { TablesPage } from '@/apps/dashboard/pages/TablesPage'
import { ComanderoConfigPage } from '@/apps/dashboard/pages/ComanderoConfigPage'
import { ShiftsPage } from '@/apps/dashboard/pages/ShiftsPage'
import { InvoicesPage } from '@/apps/dashboard/pages/InvoicesPage'
import { RolesPage } from '@/apps/dashboard/pages/RolesPage'
import { KitchenDashboardPage } from '@/apps/dashboard/pages/KitchenDashboardPage'
import { KitchenLayout } from '@/apps/kitchen/KitchenLayout'
import { KitchenDisplayPage } from '@/apps/kitchen/KitchenDisplayPage'

export const router = createHashRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/pin', element: <PinPage /> },
  {
    element: <RouteGuard requireAuth />,
    children: [
      // Dashboard — OWNER and ADMIN only
      {
        element: <RouteGuard requireRole={[EmployeeRole.OWNER, EmployeeRole.ADMIN]} redirectTo="/pos" />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardLayout />,
            children: [
              { index: true, element: <DashboardHome /> },
              { path: 'inventory', element: <InventoryPage /> },
              { path: 'products', element: <ProductsPage /> },
              { path: 'employees', element: <EmployeesPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'branches', element: <BranchesPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'tables', element: <TablesPage /> },
              { path: 'comandero-config', element: <ComanderoConfigPage /> },
              { path: 'kitchen', element: <KitchenDashboardPage /> },
              { path: 'orders', element: <OrderHistoryPage hideBackButton /> },
              { path: 'shifts', element: <ShiftsPage /> },
              { path: 'invoices', element: <InvoicesPage /> },
              { path: 'roles', element: <RolesPage /> },
            ],
          },
        ],
      },

      // POS — all authenticated users
      {
        path: '/pos',
        element: <POSLayout />,
        children: [
          { path: 'shift/open', element: <ShiftOpen /> },
          { path: 'shift/close', element: <ShiftClose /> },
          { path: 'history', element: <OrderHistoryPage /> },
          {
            element: <RouteGuard requireShift />,
            children: [
              { index: true, element: <POSMain /> },
            ],
          },
        ],
      },

      // Kitchen display — kitchen staff mode
      {
        path: '/kitchen',
        element: <KitchenLayout />,
        children: [
          { index: true, element: <KitchenDisplayPage /> },
        ],
      },
    ],
  },
])
