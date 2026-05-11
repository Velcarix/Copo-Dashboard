import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ComanderoConfigPage } from '@/apps/dashboard/pages/ComanderoConfigPage'

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('no backend')),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('ComanderoConfigPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Comandero')).toBeInTheDocument())
  })

  it('shows Mesero por mesa section', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Mesero por mesa')).toBeInTheDocument()
    })
  })

  it('shows mock table names for waiter assignment', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getAllByText('Mesa 1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Mesa 2').length).toBeGreaterThan(0)
    })
  })

  it('renders mock sections', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Sección A')).toBeInTheDocument()
    })
  })

  it('shows Meseros activos section', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Meseros activos')).toBeInTheDocument()
    })
  })

  it('shows mock waiter names', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getAllByText(/Ana García/i).length).toBeGreaterThan(0)
    })
  })

  it('has + Sección button', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ Sección/i })).toBeInTheDocument()
    })
  })

  it('opens section form on + Sección click', async () => {
    render(<MemoryRouter><ComanderoConfigPage /></MemoryRouter>)
    await waitFor(() => screen.getByRole('button', { name: /\+ Sección/i }))
    fireEvent.click(screen.getByRole('button', { name: /\+ Sección/i }))
    expect(screen.getByText('Nueva sección')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Terraza, Barra/i)).toBeInTheDocument()
  })
})
