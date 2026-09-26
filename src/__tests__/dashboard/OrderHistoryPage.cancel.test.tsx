import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrderHistoryPage } from '@/apps/dashboard/pages/OrderHistoryPage'
import { api, ApiError } from '@/shared/lib/api'

vi.mock('@/shared/lib/api', () => {
  class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  }
  return { api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }, ApiError }
})

vi.mock('@/shared/hooks/useDataViewBranch', () => ({
  useSingleDataViewBranchId: () => 'branch-1',
}))

const order = {
  id: 'order-1', orderNumber: 7, createdAt: '2026-09-20T18:00:00Z', totalAmount: 5000,
  status: 'COMPLETED', paymentMethod: 'cash', isEdited: false, employeeName: 'Ana',
  items: [{ productId: 'p1', name: 'Helado', quantity: 1, unitPrice: 5000 }],
}

async function openCancelModal() {
  render(<OrderHistoryPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
  return screen.getByLabelText('PIN o contraseña del gerente')
}

describe('OrderHistoryPage — cancelar con PIN de gerente', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue({ data: [order], total: 1 })
    vi.mocked(api.post).mockReset()
  })

  it('no deja cancelar sin escribir el PIN', async () => {
    await openCancelModal()
    expect(screen.getByRole('button', { name: 'Sí, cancelar' })).toBeDisabled()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('manda el PIN como autorización y marca la orden cancelada', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const input = await openCancelModal()
    fireEvent.change(input, { target: { value: '4321' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/orders/order-1/cancel', { authorization: '4321' }))
    await waitFor(() => expect(screen.queryByLabelText('PIN o contraseña del gerente')).not.toBeInTheDocument())
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
  })

  it('con PIN incorrecto muestra el error y deja el modal abierto', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError('INVALID_AUTHORIZATION', 'PIN o contraseña de gerente incorrecto', 403))
    const input = await openCancelModal()
    fireEvent.change(input, { target: { value: '0000' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('PIN o contraseña de gerente incorrecto')
    expect(screen.getByLabelText('PIN o contraseña del gerente')).toHaveValue('')
    expect(screen.getByText('Completada')).toBeInTheDocument()
  })
})
