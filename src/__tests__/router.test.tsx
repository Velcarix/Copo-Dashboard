// frontend/src/__tests__/router.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/shared/store/authStore'
import { RouteGuard } from '@/shared/components/RouteGuard'
import { EmployeeRole } from '@shared-types'

function TestApp({ initialPath }: { initialPath: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route element={<RouteGuard requireAuth />}>
          <Route element={<RouteGuard requireRole={[EmployeeRole.OWNER, EmployeeRole.ADMIN]} redirectTo="/login" />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RouteGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
  })

  it('redirects unauthenticated user to /login', () => {
    render(<TestApp initialPath="/dashboard" />)
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('redirects CASHIER away from /dashboard to /login', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Juan', role: EmployeeRole.CASHIER },
      accessToken: 'token',
      isAuthenticated: true,
    })
    render(<TestApp initialPath="/dashboard" />)
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('allows OWNER to access /dashboard', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Dueño', role: EmployeeRole.OWNER },
      accessToken: 'token',
      isAuthenticated: true,
    })
    render(<TestApp initialPath="/dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('allows ADMIN to access /dashboard', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Admin', role: EmployeeRole.ADMIN },
      accessToken: 'token',
      isAuthenticated: true,
    })
    render(<TestApp initialPath="/dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
