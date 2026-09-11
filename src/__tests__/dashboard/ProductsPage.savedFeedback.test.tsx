import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductsPage } from '@/apps/dashboard/pages/ProductsPage'
import { useAuthStore } from '@/shared/store/authStore'
import { useCategoryStore } from '@/shared/store/categoryStore'
import { api } from '@/shared/lib/api'

vi.mock('@/shared/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

// Producto tal como lo devuelve el backend: enum en MAYUSCULAS y el insumo como
// fila de IngredientAdjustment con el inventoryItem anidado.
const apiProduct = {
  id: 'p1',
  name: 'Doble clasico',
  description: '',
  category: 'helados',
  basePrice: 17000,
  active: true,
  imageUrl: null,
  ingredients: [],
  modifierGroups: [{
    id: 'g1',
    productId: 'p1',
    name: 'presentacion',
    inputType: 'SELECT',
    required: true,
    multiple: false,
    sortOrder: 0,
    options: [{
      id: 'o1',
      groupId: 'g1',
      name: 'cono',
      priceDelta: 0,
      sortOrder: 0,
      ingredientMode: 'CUSTOM',
      ingredientAdjustments: [
        { id: 'a1', inventoryItemId: 'inv-1', quantity: '30', inventoryItem: { name: 'Chispas', unit: 'GRAMS' } },
      ],
    }],
  }],
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url.startsWith('/api/v1/products')) return { data: [apiProduct] }
    if (url.startsWith('/api/v1/inventory')) {
      return { data: [{ id: 'inv-1', name: 'Chispas', unit: 'grams', currentStock: 500 }] }
    }
    throw new Error('no backend')
  })
  vi.mocked(api.put).mockResolvedValue({ data: apiProduct })
  useAuthStore.setState({ branchId: 'b1' })
  useCategoryStore.setState({ categories: [], loaded: false, branchId: null, error: null })
})

async function openExtras() {
  render(<MemoryRouter><ProductsPage /></MemoryRouter>)
  await screen.findByText('Doble clasico')
  await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
  await userEvent.click(screen.getByRole('button', { name: /extras/i }))
}

describe('ProductsPage — confirmacion de lo guardado', () => {
  it('marca como guardado lo que el extra descuenta del inventario', async () => {
    await openExtras()
    expect(await screen.findByText('Guardado — al venderse descuenta: 30 g Chispas')).toBeInTheDocument()
  })

  it('avisa "Sin guardar" en cuanto cambia la config del extra', async () => {
    await openExtras()
    await userEvent.click(screen.getByRole('button', { name: /inventario ✓/i }))
    const qty = await screen.findByDisplayValue('30')
    await userEvent.clear(qty)
    await userEvent.type(qty, '45')
    expect(await screen.findByText('Sin guardar — al guardar descontará: 45 g Chispas')).toBeInTheDocument()
  })

  it('confirma al guardar, con lo que devolvio el servidor', async () => {
    await openExtras()
    await userEvent.click(screen.getByRole('button', { name: /guardar producto/i }))

    const notice = await screen.findByRole('status')
    await waitFor(() => expect(within(notice).getByText('"Doble clasico" guardado')).toBeInTheDocument())
    expect(within(notice).getByText('1 opción de extras descuenta inventario al venderse')).toBeInTheDocument()
  })
})
