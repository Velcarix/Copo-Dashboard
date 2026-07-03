import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { RolesPage } from '@/apps/dashboard/pages/RolesPage'

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('no backend')),
    put: vi.fn().mockResolvedValue({}),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('RolesPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><RolesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Permisos por rol/i)).toBeInTheDocument())
  })

  it('renders all editable role columns', async () => {
    render(<MemoryRouter><RolesPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Cajero')).toBeInTheDocument()
      expect(screen.getByText('Mesero')).toBeInTheDocument()
      expect(screen.getByText('Cocina')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.queryByText('Dueño')).not.toBeInTheDocument()
    })
  })

  it('renders permission group headers', async () => {
    render(<MemoryRouter><RolesPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Módulos')).toBeInTheDocument()
      expect(screen.getByText('POS')).toBeInTheDocument()
      expect(screen.getByText('Comandero')).toBeInTheDocument()
      expect(screen.getByText('Administración')).toBeInTheDocument()
    })
  })

  it('shows permission labels', async () => {
    render(<MemoryRouter><RolesPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Acceder al POS')).toBeInTheDocument()
      expect(screen.getByText('Aplicar descuentos')).toBeInTheDocument()
      expect(screen.getByText('Emitir facturas CFDI')).toBeInTheDocument()
    })
  })

  it('marks save button disabled when no changes', async () => {
    render(<MemoryRouter><RolesPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Cajero'))
    const saveBtn = screen.getByRole('button', { name: /Guardar Cajero/i })
    expect(saveBtn).toBeDisabled()
  })

  it('enables save button after toggling a permission', async () => {
    render(<MemoryRouter><RolesPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Cajero'))

    // Toggle the first switch in the Cajero column (canAccessPOS — row index 0)
    const switches = screen.getAllByRole('switch')
    // switches layout: [Cajero, Mesero, Cocina, Admin] per permission row
    // first switch is Cajero's canAccessPOS
    fireEvent.click(switches[0])

    await waitFor(() => {
      const saveBtn = screen.getByRole('button', { name: /Guardar Cajero/i })
      expect(saveBtn).not.toBeDisabled()
    })
  })
})
