import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsPage } from '@/apps/dashboard/pages/SettingsPage'
import { api } from '@/shared/lib/api'

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('no backend')),
    put: vi.fn().mockResolvedValue({}),
    post: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('SettingsPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/configuración/i)).toBeInTheDocument())
  })

  it('renders all tabs', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Datos Fiscales')).toBeInTheDocument()
      expect(screen.getByText('Cocina')).toBeInTheDocument()
      expect(screen.getByText('Mesas')).toBeInTheDocument()
    })
  })

  it('switches to Cocina tab', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Cocina'))
    fireEvent.click(screen.getByText('Cocina'))
    await waitFor(() => expect(screen.getByText('Pantalla de cocina')).toBeInTheDocument())
  })

  it('renders fiscal fields and not the old Negocio fields', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('RFC')).toBeInTheDocument())
    expect(screen.getByText('Régimen fiscal')).toBeInTheDocument()
    expect(screen.getByText('Datos de facturación')).toBeInTheDocument()
    expect(screen.queryByText('Nombre del negocio')).not.toBeInTheDocument()
    expect(screen.queryByText('Dirección')).not.toBeInTheDocument()
    expect(screen.queryByText('Tema de la interfaz')).not.toBeInTheDocument()
  })
})

describe('SettingsPage - Copo Loyalty tab', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(api.delete).mockReset()
  })

  it('renders the Copo Loyalty tab button', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('no backend'))
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Copo Loyalty')).toBeInTheDocument())
  })

  it('shows the link form when the business is not linked', async () => {
    vi.mocked(api.get).mockImplementation((path: string) =>
      path.includes('loyalty-integration/status')
        ? Promise.resolve({ data: { linked: false } })
        : Promise.reject(new Error('no backend')),
    )
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Copo Loyalty'))
    fireEvent.click(screen.getByText('Copo Loyalty'))
    await waitFor(() => expect(screen.getByPlaceholderText('12345678')).toBeInTheDocument())
    expect(screen.getByText('Vincular')).toBeInTheDocument()
  })

  it('shows Vinculado and a Desvincular button when the business is linked', async () => {
    vi.mocked(api.get).mockImplementation((path: string) =>
      path.includes('loyalty-integration/status')
        ? Promise.resolve({ data: { linked: true } })
        : Promise.reject(new Error('no backend')),
    )
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Copo Loyalty'))
    fireEvent.click(screen.getByText('Copo Loyalty'))
    await waitFor(() => expect(screen.getByText(/Vinculado con Copo Loyalty/)).toBeInTheDocument())
    expect(screen.getByText('Desvincular')).toBeInTheDocument()
  })

  it('links with an 8-digit code', async () => {
    vi.mocked(api.get).mockImplementation((path: string) =>
      path.includes('loyalty-integration/status')
        ? Promise.resolve({ data: { linked: false } })
        : Promise.reject(new Error('no backend')),
    )
    vi.mocked(api.post).mockResolvedValue({ data: { linked: true } })
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Copo Loyalty'))
    fireEvent.click(screen.getByText('Copo Loyalty'))
    const input = await screen.findByPlaceholderText('12345678')
    fireEvent.change(input, { target: { value: '12345678' } })
    fireEvent.click(screen.getByText('Vincular'))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/v1/loyalty-integration/link', { code: '12345678' }),
    )
  })

  it('unlinks when Desvincular is clicked', async () => {
    vi.mocked(api.get).mockImplementation((path: string) =>
      path.includes('loyalty-integration/status')
        ? Promise.resolve({ data: { linked: true } })
        : Promise.reject(new Error('no backend')),
    )
    vi.mocked(api.delete).mockResolvedValue({ data: { linked: false } })
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    await waitFor(() => screen.getByText('Copo Loyalty'))
    fireEvent.click(screen.getByText('Copo Loyalty'))
    await waitFor(() => screen.getByText('Desvincular'))
    fireEvent.click(screen.getByText('Desvincular'))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/v1/loyalty-integration/link'))
  })
})
