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
        <Route path="/pin" element={<div>PIN</div>} />
        <Route element={<RouteGuard requireAuth />}>
          <Route element={<RouteGuard requireRole={[EmployeeRole.OWNER, EmployeeRole.ADMIN]} redirectTo="/pos" />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route element={<RouteGuard requireShift />}>
            <Route path="/pos" element={<div>POS</div>} />
          </Route>
          <Route path="/pos/shift/open" element={<div>Abrir turno</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RouteGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, shiftId: null, isAuthenticated: false })
  })

  it('redirects unauthenticated user to /login', () => {
    render(<TestApp initialPath="/pos" />)
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('redirects CASHIER away from /dashboard to /pos', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Juan', role: EmployeeRole.CASHIER },
      accessToken: 'token',
      shiftId: 'shift-1',
      isAuthenticated: true,
    })
    render(<TestApp initialPath="/dashboard" />)
    expect(screen.getByText('POS')).toBeInTheDocument()
  })

  it('allows OWNER to access /dashboard', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Dueño', role: EmployeeRole.OWNER },
      accessToken: 'token',
      shiftId: null,
      isAuthenticated: true,
    })
    render(<TestApp initialPath="/dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects authenticated CASHIER without shift to /pos/shift/open', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Juan', role: EmployeeRole.CASHIER },
      accessToken: 'token',
      shiftId: null,
      isAuthenticated: true,
    })
    render(<TestApp initialPath="/pos" />)
    expect(screen.getByText('Abrir turno')).toBeInTheDocument()
  })

  it('allows OWNER to access /pos without open shift', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Dueño', role: EmployeeRole.OWNER },
      accessToken: 'token',
      shiftId: null,
      isAuthenticated: true,
    })
    render(<TestApp initialPath="/pos" />)
    expect(screen.getByText('POS')).toBeInTheDocument()
  })
})
