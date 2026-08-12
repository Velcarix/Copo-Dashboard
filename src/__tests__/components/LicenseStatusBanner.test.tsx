import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LicenseStatusBanner } from '@/shared/components/LicenseStatusBanner'
import { useAuthStore } from '@/shared/store/authStore'
import { api } from '@/shared/lib/api'

vi.mock('@/shared/lib/api', () => ({
  api: { post: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

beforeEach(() => {
  useAuthStore.setState({ licenseKey: 'COPO-TEST-KEY' })
  vi.mocked(api.post).mockReset()
})

describe('LicenseStatusBanner', () => {
  it('renders nothing while the license is active', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })
    const { container } = render(<LicenseStatusBanner />)
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a yellow warning when the license is expired', async () => {
    const { ApiError } = await import('@/shared/lib/api')
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError('LICENSE_EXPIRED', 'expired', 402))
    render(<LicenseStatusBanner />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/licencia está vencida/i)
    expect(alert).toHaveTextContent('soporte@copopos.com')
  })

  it('renders nothing for unrelated errors (e.g. offline)', async () => {
    const { ApiError } = await import('@/shared/lib/api')
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'offline', 0))
    const { container } = render(<LicenseStatusBanner />)
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
