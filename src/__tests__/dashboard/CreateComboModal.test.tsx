import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateComboModal } from '@/apps/dashboard/pages/CreateComboModal'
import { useCategoryStore } from '@/shared/store/categoryStore'
import { ComboSlotSource, PricingMode } from '@shared-types'

const apiPost = vi.fn().mockResolvedValue({ data: {} })
const apiPut = vi.fn().mockResolvedValue({ data: {} })

vi.mock('@/shared/lib/api', () => ({
  api: { post: (...args: unknown[]) => apiPost(...args), put: (...args: unknown[]) => apiPut(...args) },
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) { super(message) }
  },
}))

const PRODUCTS = [
  { id: 'p1', name: 'Café Americano', category: 'cafe', basePrice: 3500, active: true },
  { id: 'p2', name: 'Latte', category: 'cafe', basePrice: 0, active: true },
  { id: 'p3', name: 'Croissant', category: 'panaderia', basePrice: 3000, active: true },
  { id: 'p4', name: 'Vaso', category: 'helados', basePrice: 2500, active: true, maxFlavors: 2 },
]

beforeEach(() => {
  apiPost.mockClear()
  apiPut.mockClear()
  useCategoryStore.setState({
    categories: [
      { id: 'c1', key: 'cafe', label: 'Café', emoji: '☕', color: '#6366f1', sortOrder: 0, hidden: false, pricingMode: PricingMode.VARIANTS },
      { id: 'c2', key: 'panaderia', label: 'Panadería', emoji: '🥐', color: '#f59e0b', sortOrder: 1, hidden: false, pricingMode: PricingMode.FIXED },
      { id: 'c3', key: 'helados', label: 'Helados', emoji: '🍦', color: '#0ea5e9', sortOrder: 2, hidden: false, pricingMode: PricingMode.PRESENTATION },
    ],
    loaded: true,
    branchId: 'b1',
    error: null,
  })
})

describe('CreateComboModal', () => {
  it('starts with 0 slots and disabled save button', () => {
    render(<CreateComboModal products={PRODUCTS} branchId="b1" onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.getByRole('button', { name: /crear combo/i })).toBeDisabled()
  })

  it('makes VARIANTS products selectable (regression of the old exclusion)', async () => {
    const user = userEvent.setup()
    render(<CreateComboModal products={PRODUCTS} branchId="b1" onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /agregar slot/i }))
    expect(screen.getByText('Café Americano')).toBeInTheDocument()
    expect(screen.getByText('Latte')).toBeInTheDocument()
  })

  it('rejects a SPECIFIC_PRODUCTS slot with no options and accepts one with 1 option', async () => {
    const user = userEvent.setup()
    render(<CreateComboModal products={PRODUCTS} branchId="b1" onClose={vi.fn()} onCreated={vi.fn()} />)

    await user.type(screen.getByPlaceholderText(/3 helados 3x2/i), 'Combo café')
    await user.type(screen.getByPlaceholderText('0.00'), '50')
    await user.click(screen.getByRole('button', { name: /agregar slot/i }))
    await user.type(screen.getByPlaceholderText(/nombre del slot/i), 'Elige tu café')
    await user.click(screen.getByRole('button', { name: '+' })) // quantity 1 -> 2 (RN-C09: total units >= 2)

    const saveBtn = screen.getByRole('button', { name: /crear combo/i })
    expect(saveBtn).toBeDisabled() // sin opciones todavía

    await user.click(screen.getByText('Café Americano'))
    expect(saveBtn).not.toBeDisabled()
  })

  it('builds the correct slots[] payload for a CATEGORY slot with quantity 3', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    render(<CreateComboModal products={PRODUCTS} branchId="b1" onClose={vi.fn()} onCreated={onCreated} />)

    await user.type(screen.getByPlaceholderText(/3 helados 3x2/i), '3 Helados 3x2')
    await user.type(screen.getByPlaceholderText('0.00'), '150')
    await user.click(screen.getByRole('button', { name: /agregar slot/i }))
    await user.type(screen.getByPlaceholderText(/nombre del slot/i), 'Elige tu helado')
    await user.click(screen.getByRole('button', { name: 'Categoría' }))
    await user.selectOptions(screen.getByRole('combobox'), 'helados')
    await user.click(screen.getByRole('button', { name: '+' })) // quantity 1 -> 2
    await user.click(screen.getByRole('button', { name: '+' })) // quantity 2 -> 3

    const saveBtn = screen.getByRole('button', { name: /crear combo/i })
    expect(saveBtn).not.toBeDisabled()
    await user.click(saveBtn)

    expect(apiPost).toHaveBeenCalledWith('/api/v1/products/combo', expect.objectContaining({
      branchId: 'b1',
      name: '3 Helados 3x2',
      basePrice: 15000,
      slots: [expect.objectContaining({
        name: 'Elige tu helado',
        quantity: 3,
        source: ComboSlotSource.CATEGORY,
        categoryId: 'helados',
        options: [],
      })],
    }))
    expect(onCreated).toHaveBeenCalled()
  })

  it('loads an existing combo (migrated: one slot, one fixed option) into the editor', () => {
    render(
      <CreateComboModal
        products={PRODUCTS}
        branchId="b1"
        combo={{
          id: 'cmb1',
          name: 'Combo viejo',
          basePrice: 12000,
          comboSlots: [
            { id: 'slot1', name: 'Croissant', quantity: 1, source: ComboSlotSource.SPECIFIC_PRODUCTS, options: [{ productId: 'p3', priceDelta: 0, name: 'Croissant' }] },
          ],
        }}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Combo viejo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Croissant')).toBeInTheDocument()
    expect(screen.getAllByText('Croissant').length).toBeGreaterThan(0)
  })
})
