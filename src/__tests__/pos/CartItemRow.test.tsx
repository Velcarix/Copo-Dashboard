import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CartItemRow } from '@/apps/pos/components/CartItemRow'
import type { CartItem } from '@shared-types'

const item: CartItem = {
  localId: 'li1',
  productId: 'p1',
  productName: 'Americano',
  quantity: 2,
  unitPrice: 3500,
  modifiers: [{ optionId: 'o1', optionName: 'Grande', priceDelta: 1000 }],
}

describe('CartItemRow', () => {
  it('renders product name and total price', () => {
    render(<CartItemRow item={item} onQtyChange={vi.fn()} onRemove={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByText('Americano')).toBeInTheDocument()
    // (3500 + 1000) * 2 = 9000 centavos = $90.00
    expect(screen.getByText('$90.00')).toBeInTheDocument()
  })

  it('shows modifier names', () => {
    render(<CartItemRow item={item} onQtyChange={vi.fn()} onRemove={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByText('Grande')).toBeInTheDocument()
  })

  it('calls onQtyChange with qty+1 on + click', async () => {
    const onQtyChange = vi.fn()
    render(<CartItemRow item={item} onQtyChange={onQtyChange} onRemove={vi.fn()} onEdit={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('aumentar cantidad'))
    expect(onQtyChange).toHaveBeenCalledWith('li1', 3)
  })

  it('calls onQtyChange with qty-1 on - click', async () => {
    const onQtyChange = vi.fn()
    render(<CartItemRow item={item} onQtyChange={onQtyChange} onRemove={vi.fn()} onEdit={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('disminuir cantidad'))
    expect(onQtyChange).toHaveBeenCalledWith('li1', 1)
  })

  it('calls onRemove when quantity would reach 0', async () => {
    const onRemove = vi.fn()
    const singleItem = { ...item, quantity: 1 }
    render(<CartItemRow item={singleItem} onQtyChange={vi.fn()} onRemove={onRemove} onEdit={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('disminuir cantidad'))
    expect(onRemove).toHaveBeenCalledWith('li1')
  })

  it('calls onEdit when edit button clicked', async () => {
    const onEdit = vi.fn()
    render(<CartItemRow item={item} onQtyChange={vi.fn()} onRemove={vi.fn()} onEdit={onEdit} />)
    await userEvent.click(screen.getByLabelText('editar'))
    expect(onEdit).toHaveBeenCalledWith(item)
  })

  it('shows multiple modifier names joined by comma', () => {
    const multiItem: CartItem = {
      localId: 'li2',
      productId: 'p1',
      productName: 'Latte',
      quantity: 1,
      unitPrice: 4000,
      modifiers: [
        { optionId: 'o1', optionName: 'Grande', priceDelta: 1000 },
        { optionId: 'o2', optionName: 'Sin azúcar', priceDelta: 0 },
      ],
    }
    render(<CartItemRow item={multiItem} onQtyChange={vi.fn()} onRemove={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByText('Grande, Sin azúcar')).toBeInTheDocument()
  })
})
