import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { EmployeesPage } from '@/apps/dashboard/pages/EmployeesPage'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')), post: vi.fn(), put: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

describe('EmployeesPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><EmployeesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/empleados/i)).toBeInTheDocument())
  })
})
