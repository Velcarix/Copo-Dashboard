// createHashRouter is used so deep links (https://app.copo.mx/#/dashboard) work
// correctly on Vercel's static hosting without extra server-side rewrites.
import { createHashRouter, Navigate } from 'react-router-dom'
import { EmployeeRole } from '@shared-types'
import { RouteGuard } from '@/shared/components/RouteGuard'
import { LicenseGatePage } from '@/apps/auth/LicenseGatePage'
import { LoginPage } from '@/apps/auth/LoginPage'
import { ForgotPasswordPage } from '@/apps/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/apps/auth/ResetPasswordPage'
import { BranchSelectorPage } from '@/apps/auth/BranchSelectorPage'

import { DashboardLayout } from '@/apps/dashboard/layout/DashboardLayout'
import { DashboardHome } from '@/apps/dashboard/pages/DashboardHome'
import { InventoryPage } from '@/apps/dashboard/pages/InventoryPage'
import { ProductsPage } from '@/apps/dashboard/pages/ProductsPage'
import { EmployeesPage } from '@/apps/dashboard/pages/EmployeesPage'
import { ReportsPage } from '@/apps/dashboard/pages/ReportsPage'
import { SettingsPage } from '@/apps/dashboard/pages/SettingsPage'
import { TablesPage } from '@/apps/dashboard/pages/TablesPage'
import { ComanderoConfigPage } from '@/apps/dashboard/pages/ComanderoConfigPage'
import { ShiftsPage } from '@/apps/dashboard/pages/ShiftsPage'
import { InvoicesPage } from '@/apps/dashboard/pages/InvoicesPage'
import { RolesPage } from '@/apps/dashboard/pages/RolesPage'
import { KitchenDashboardPage } from '@/apps/dashboard/pages/KitchenDashboardPage'
import { OrderHistoryPage } from '@/apps/dashboard/pages/OrderHistoryPage'

export const router = createHashRouter([
  { path: '/', element: <Navigate to="/license" replace /> },
  { path: '/license', element: <LicenseGatePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <RouteGuard requireAuth />,
    children: [
      { path: '/branch-select', element: <BranchSelectorPage /> },
    ],
  },
  {
    element: <RouteGuard requireAuth />,
    children: [
      // Dashboard — OWNER and ADMIN only
      {
        element: <RouteGuard requireRole={[EmployeeRole.OWNER, EmployeeRole.ADMIN]} redirectTo="/login" />,
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
              { path: 'settings', element: <SettingsPage /> },
              { path: 'tables', element: <TablesPage /> },
              { path: 'comandero-config', element: <ComanderoConfigPage /> },
              { path: 'kitchen', element: <KitchenDashboardPage /> },
              { path: 'orders', element: <OrderHistoryPage /> },
              { path: 'shifts', element: <ShiftsPage /> },
              { path: 'invoices', element: <InvoicesPage /> },
              { path: 'roles', element: <RolesPage /> },
            ],
          },
        ],
      },
    ],
  },
])
