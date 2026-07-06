import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { DashboardLayout } from '@/apps/dashboard/layout/DashboardLayout'

function Wrapper({ path = '/dashboard' }: { path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/*" element={<DashboardLayout />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardLayout', () => {
  it('renders Copo logo', () => {
    render(<Wrapper />)
    expect(screen.getByAltText('Copo')).toBeInTheDocument()
  })

  it('renders nav links', () => {
    render(<Wrapper />)
    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getByText('Inventario')).toBeInTheDocument()
    expect(screen.getByText('Productos')).toBeInTheDocument()
  })
})
