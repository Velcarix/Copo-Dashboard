import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ModifierSheet } from '@/apps/pos/components/modifiers/ModifierSheet'
import { ModifierInputType } from '@shared-types'
import type { ProductWithModifiers } from '@/shared/store/posStore'

const product: ProductWithModifiers = {
  id: 'p1', name: 'Americano', category: 'COFFEE', basePrice: 3500,
  imageUrl: null, active: true,
  modifierGroups: [
    {
      id: 'g1', productId: 'p1', name: 'Tamaño', required: true, multiple: false, sortOrder: 0,
      inputType: ModifierInputType.SELECT,
      options: [
        { id: 'o1', groupId: 'g1', name: 'Chico', priceDelta: 0, sortOrder: 0 },
        { id: 'o2', groupId: 'g1', name: 'Grande', priceDelta: 1000, sortOrder: 1 },
      ],
    },
  ],
}

describe('ModifierSheet', () => {
  it('is not visible when product is null', () => {
    render(<ModifierSheet product={null} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText('Agregar al carrito')).not.toBeInTheDocument()
  })

  it('shows product name when open', () => {
    render(<ModifierSheet product={product} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Americano')).toBeInTheDocument()
  })

  it('confirm button is disabled when required group has no selection', () => {
    render(<ModifierSheet product={product} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /agregar/i })).toBeDisabled()
  })

  it('confirm button enables after selecting required option', async () => {
    render(<ModifierSheet product={product} onConfirm={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Chico'))
    expect(screen.getByRole('button', { name: /agregar/i })).not.toBeDisabled()
  })

  it('calls onConfirm with correct modifiers', async () => {
    const onConfirm = vi.fn()
    render(<ModifierSheet product={product} onConfirm={onConfirm} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Grande'))
    await userEvent.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      [{ optionId: 'o2', optionName: 'Grande', priceDelta: 1000 }],
      undefined,
    )
  })

  it('calls onClose when cancel button clicked', async () => {
    const onClose = vi.fn()
    render(<ModifierSheet product={product} onConfirm={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('cerrar'))
    expect(onClose).toHaveBeenCalled()
  })
})
