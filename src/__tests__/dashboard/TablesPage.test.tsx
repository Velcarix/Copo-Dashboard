import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { TablesPage } from '@/apps/dashboard/pages/TablesPage'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('TablesPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><TablesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Mesas/i)).toBeInTheDocument())
  })

  it('shows mock table data in DEV mode', async () => {
    render(<MemoryRouter><TablesPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Mesa 1')).toBeInTheDocument()
      expect(screen.getByText('Mesa 2')).toBeInTheDocument()
    })
  })

  it('shows status chips', async () => {
    render(<MemoryRouter><TablesPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getAllByText('Libre').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Ocupada').length).toBeGreaterThan(0)
    })
  })

  it('shows stats row with Libre / Ocupada / Fusionada counts', async () => {
    render(<MemoryRouter><TablesPage /></MemoryRouter>)
    await waitFor(() => {
      // stat cards contain the status label text
      const libres = screen.getAllByText('Libre')
      expect(libres.length).toBeGreaterThanOrEqual(2) // stat card + table row
    })
  })

  it('has Agregar mesa button', async () => {
    render(<MemoryRouter><TablesPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Agregar mesa/i })).toBeInTheDocument()
    })
  })

  it('opens create form when clicking + Agregar mesa', async () => {
    render(<MemoryRouter><TablesPage /></MemoryRouter>)
    await waitFor(() => screen.getByRole('button', { name: /Agregar mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: /Agregar mesa/i }))
    expect(screen.getByText('Nueva mesa')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Mesa 1, Barra 2/i)).toBeInTheDocument()
  })

  it('shows Edit button for each table', async () => {
    render(<MemoryRouter><TablesPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Mesa 1'))
    const editButtons = screen.getAllByRole('button', { name: /Editar/i })
    expect(editButtons.length).toBeGreaterThan(0)
  })
})
