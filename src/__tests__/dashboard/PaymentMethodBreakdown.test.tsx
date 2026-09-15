import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PaymentMethodBreakdown } from '@/apps/dashboard/components/PaymentMethodBreakdown'

describe('PaymentMethodBreakdown', () => {
  it('no dibuja nada si el backend no manda paymentMethods', () => {
    const { container } = render(<PaymentMethodBreakdown />)
    expect(container).toBeEmptyDOMElement()
  })

  it('siempre muestra efectivo, tarjeta y delivery, aunque estén en cero', () => {
    render(<PaymentMethodBreakdown methods={[]} />)
    expect(screen.getByTestId('payment-cash')).toHaveTextContent('Efectivo')
    expect(screen.getByTestId('payment-card')).toHaveTextContent('Tarjeta')
    expect(screen.getByTestId('payment-delivery')).toHaveTextContent('Delivery')
    expect(screen.queryByTestId('payment-transfer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('payment-mixed')).not.toBeInTheDocument()
  })

  it('junta QR y transferencia y calcula el porcentaje sobre el total', () => {
    render(
      <PaymentMethodBreakdown
        methods={[
          { method: 'CASH', total: 50000, count: 2 },
          { method: 'QR', total: 30000, count: 1 },
          { method: 'TRANSFER', total: 20000, count: 1 },
        ]}
      />,
    )
    expect(screen.getByTestId('payment-cash')).toHaveTextContent('50%')
    const transfer = screen.getByTestId('payment-transfer')
    expect(transfer).toHaveTextContent('50%')
    expect(transfer).toHaveTextContent('2 órdenes')
  })
})
