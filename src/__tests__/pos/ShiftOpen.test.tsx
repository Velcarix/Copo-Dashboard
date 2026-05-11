import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ShiftOpen } from '@/apps/pos/pages/ShiftOpen'
import { useAuthStore } from '@/shared/store/authStore'
import { useNetworkStore } from '@/shared/store/networkStore'
import { EmployeeRole } from '@shared-types'

vi.mock('@/shared/lib/api', () => ({
  api: { post: vi.fn() },
  ApiError: class ApiError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } },
}))

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'u1', name: 'Juan', role: EmployeeRole.CASHIER }, accessToken: 'token', shiftId: null, isAuthenticated: true })
  useNetworkStore.setState({ isOnline: true, pendingSyncCount: 0 })
})

describe('ShiftOpen', () => {
  it('renders opening cash input and confirm button', () => {
    render(<MemoryRouter><ShiftOpen /></MemoryRouter>)
    expect(screen.getByText(/abrir turno/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('confirm is disabled when no cash entered', () => {
    render(<MemoryRouter><ShiftOpen /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()
  })
})
