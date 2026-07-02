import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPage } from '@/apps/dashboard/pages/SettingsPage'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')), put: vi.fn().mockResolvedValue({}) },
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
      expect(screen.getByText('General')).toBeInTheDocument()
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
})
