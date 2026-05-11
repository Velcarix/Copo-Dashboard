import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { DashboardHome } from '@/apps/dashboard/pages/DashboardHome'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')) },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

;(globalThis as unknown as Record<string, unknown>).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('DashboardHome', () => {
  it('renders heading', async () => {
    render(<MemoryRouter><DashboardHome /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/resumen/i)).toBeInTheDocument())
  })
})
