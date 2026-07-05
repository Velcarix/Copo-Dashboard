import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductsPage } from '@/apps/dashboard/pages/ProductsPage'
import { useAuthStore } from '@/shared/store/authStore'
import { useCategoryStore } from '@/shared/store/categoryStore'
import { PricingMode } from '@shared-types'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('no backend')), post: vi.fn(), put: vi.fn().mockResolvedValue({ data: {} }), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

beforeEach(() => {
  useAuthStore.setState({ branchId: 'b1' })
  useCategoryStore.setState({ categories: [], loaded: false, branchId: null, error: null })
})

describe('ProductsPage', () => {
  it('renders page heading', async () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/productos/i)).toBeInTheDocument())
  })

  it('renders add product button', async () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('button', { name: /nuevo producto/i })).toBeInTheDocument())
  })

  it('asks for confirmation before saving a product at $0 with no priced required group', async () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /nuevo producto/i }))
    await userEvent.type(screen.getByPlaceholderText(/copa de helado especial/i), 'Producto de prueba')
    await userEvent.click(screen.getByRole('button', { name: /guardar producto/i }))
    expect(await screen.findByText(/¿guardar en \$0\?/i)).toBeInTheDocument()
  })

  it('warns when unchecking Requerido on a group with priced options', async () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /nuevo producto/i }))
    await userEvent.click(screen.getByRole('button', { name: /extras/i }))
    await userEvent.click(screen.getByRole('button', { name: /agregar grupo de opciones/i }))
    await userEvent.click(screen.getByText('+ Agregar opción'))
    await userEvent.type(screen.getByPlaceholderText('0.00'), '10')
    await userEvent.click(screen.getByLabelText(/requerido/i))
    expect(await screen.findByText(/el cajero puede vender este producto en \$0/i)).toBeInTheDocument()
  })

  it('lets the owner switch a category to VARIANTS and edit its variant scheme', async () => {
    useCategoryStore.setState({
      categories: [{ id: 'c1', key: 'helados', label: 'Helados', emoji: '🍦', color: '#6366f1', sortOrder: 0, hidden: false, pricingMode: PricingMode.FIXED }],
      loaded: true,
      branchId: 'b1',
      error: null,
    })
    render(<MemoryRouter><ProductsPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Categorías' }))
    await userEvent.click(screen.getByTitle('¿Cómo se cobra esta categoría?'))
    await userEvent.click(screen.getByRole('button', { name: 'Por tamaño' }))
    expect(await screen.findByText('Esquema de variantes (ej. Chico, Mediano, Grande)')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Nombre de variante'), 'Grande')
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar variante' }))
    expect(await screen.findByText('Grande')).toBeInTheDocument()
  })
})
