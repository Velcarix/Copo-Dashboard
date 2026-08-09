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
    // Labels appear twice by design: once in the desktop sidebar, once in the
    // mobile bottom nav (both exist in the DOM, toggled via CSS breakpoints).
    expect(screen.getAllByText('Inicio').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inventario').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Productos').length).toBeGreaterThan(0)
  })
})
