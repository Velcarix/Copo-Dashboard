// frontend/src/__tests__/lib/currency.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, centsToPesos, pesosToCents } from '@/shared/lib/currency'

describe('formatCurrency', () => {
  it('formats 3500 cents as $35.00', () => {
    expect(formatCurrency(3500)).toBe('$35.00')
  })
  it('formats 0 cents as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
  it('formats 150 cents as $1.50', () => {
    expect(formatCurrency(150)).toBe('$1.50')
  })
  it('formats 100000 cents as $1,000.00', () => {
    expect(formatCurrency(100000)).toBe('$1,000.00')
  })
})

describe('centsToPesos', () => {
  it('converts 3500 to 35', () => {
    expect(centsToPesos(3500)).toBe(35)
  })
})

describe('pesosToCents', () => {
  it('converts 35 to 3500', () => {
    expect(pesosToCents(35)).toBe(3500)
  })
  it('converts 35.50 to 3550', () => {
    expect(pesosToCents(35.5)).toBe(3550)
  })
})
