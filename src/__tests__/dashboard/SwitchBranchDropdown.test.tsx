import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { EmployeeRole } from '@shared-types'
import { DashboardLayout } from '@/apps/dashboard/layout/DashboardLayout'
import { useAuthStore } from '@/shared/store/authStore'
import { useBranchStore } from '@/shared/store/branchStore'

const BRANCHES = [
  { id: 'b1', name: 'Francisco de Montejo', role: EmployeeRole.ADMIN },
  { id: 'b2', name: 'Gran Plaza',           role: EmployeeRole.ADMIN },
  { id: 'b3', name: 'Las americas',         role: EmployeeRole.ADMIN },
]

function signIn(role: EmployeeRole, availableBranches: typeof BRANCHES) {
  useAuthStore.setState({
    user: { id: 'e1', name: 'dariela1', role },
    accessToken: 'token',
    branchId: availableBranches[0]?.id ?? null,
    isAuthenticated: true,
    availableBranches,
  })
  useBranchStore.setState({ selectedId: availableBranches[0]?.id ?? 'ALL' })
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/reports']}>
      <Routes>
        <Route path="/dashboard/*" element={<DashboardLayout />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Sesión activa — opción "Todas las sucursales"', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, availableBranches: [], branchId: null, isAuthenticated: false })
  })

  it('la ofrece a un ADMIN con acceso a varias sucursales', () => {
    signIn(EmployeeRole.ADMIN, BRANCHES)
    renderLayout()

    // Dos instancias del dropdown (sidebar desktop + header móvil); basta abrir una.
    fireEvent.click(screen.getAllByText('Francisco de Montejo')[0])

    expect(screen.getAllByText('Todas las sucursales').length).toBeGreaterThan(0)
  })

  it('no la ofrece cuando el empleado solo tiene una sucursal', () => {
    // Con una sola sucursal el dropdown completo se oculta: no hay nada que elegir.
    signIn(EmployeeRole.ADMIN, BRANCHES.slice(0, 1))
    renderLayout()

    expect(screen.queryByText('Todas las sucursales')).not.toBeInTheDocument()
  })

  it('seleccionarla cambia solo la vista de datos, no la sesión activa', () => {
    signIn(EmployeeRole.ADMIN, BRANCHES)
    renderLayout()

    fireEvent.click(screen.getAllByText('Francisco de Montejo')[0])
    fireEvent.click(screen.getAllByText('Todas las sucursales')[0])

    expect(useBranchStore.getState().selectedId).toBe('ALL')
    expect(useAuthStore.getState().branchId).toBe('b1')
  })
})
