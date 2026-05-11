import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ShiftClose } from '@/apps/pos/pages/ShiftClose'
import { useAuthStore } from '@/shared/store/authStore'
import { EmployeeRole } from '@shared-types'

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { expectedCash: 50000 } }),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'u1', name: 'Juan', role: EmployeeRole.CASHIER },
    accessToken: 'token',
    shiftId: 'shift-1',
    isAuthenticated: true,
  })
})

describe('ShiftClose', () => {
  it('renders cerrar turno heading', () => {
    render(<MemoryRouter><ShiftClose /></MemoryRouter>)
    expect(screen.getByText(/cerrar turno/i)).toBeInTheDocument()
  })

  it('shows confirm button', () => {
    render(<MemoryRouter><ShiftClose /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })
})
