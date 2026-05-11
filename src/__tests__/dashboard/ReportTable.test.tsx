import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ReportTable } from '@/apps/dashboard/components/ReportTable'

const columns = [
  { key: 'name', label: 'Nombre' },
  { key: 'amount', label: 'Monto' },
]
const data = [
  { name: 'Venta #001', amount: '$35.00' },
  { name: 'Venta #002', amount: '$52.00' },
]

describe('ReportTable', () => {
  it('renders column headers', () => {
    render(<ReportTable columns={columns} data={data} total={2} page={1} onPageChange={vi.fn()} />)
    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Monto')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<ReportTable columns={columns} data={data} total={2} page={1} onPageChange={vi.fn()} />)
    expect(screen.getByText('Venta #001')).toBeInTheDocument()
    expect(screen.getByText('$52.00')).toBeInTheDocument()
  })

  it('calls onPageChange when next page clicked', async () => {
    const onPageChange = vi.fn()
    render(<ReportTable columns={columns} data={data} total={40} page={1} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByLabelText('siguiente página'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
