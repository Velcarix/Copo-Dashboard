import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ProductCard } from '@/apps/pos/components/ProductCard'
import { ModifierInputType } from '@shared-types'
import type { ProductWithModifiers } from '@/shared/store/posStore'

const baseProduct: ProductWithModifiers = {
  id: 'p1',
  name: 'Vainilla',
  category: 'ICE_CREAM',
  basePrice: 3500,
  imageUrl: null,
  active: true,
  modifierGroups: [],
}

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(<ProductCard product={baseProduct} onTap={vi.fn()} />)
    expect(screen.getByText('Vainilla')).toBeInTheDocument()
    expect(screen.getByText('$35.00')).toBeInTheDocument()
  })

  it('shows modifier indicator when product has modifierGroups', () => {
    const productWithMods: ProductWithModifiers = {
      ...baseProduct,
      modifierGroups: [{
        id: 'g1', productId: 'p1', name: 'Tamaño',
        required: true, multiple: false, sortOrder: 0,
        inputType: ModifierInputType.SELECT,
        options: [{ id: 'o1', groupId: 'g1', name: 'Chico', priceDelta: 0, sortOrder: 0 }],
      }],
    }
    render(<ProductCard product={productWithMods} onTap={vi.fn()} />)
    expect(screen.getByLabelText('tiene modificadores')).toBeInTheDocument()
  })

  it('does not show modifier indicator for product without modifiers', () => {
    render(<ProductCard product={baseProduct} onTap={vi.fn()} />)
    expect(screen.queryByLabelText('tiene modificadores')).not.toBeInTheDocument()
  })

  it('calls onTap when clicked', async () => {
    const onTap = vi.fn()
    render(<ProductCard product={baseProduct} onTap={onTap} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledWith(baseProduct)
  })
})
