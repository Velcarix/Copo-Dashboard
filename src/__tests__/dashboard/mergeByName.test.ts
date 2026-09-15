import { describe, it, expect } from 'vitest'
import { groupByName, mergeByName, nameKey } from '@/apps/dashboard/lib/mergeByName'

describe('nameKey', () => {
  it('ignora mayúsculas, acentos y espacios de más', () => {
    expect(nameKey('  Vaso   Doble ')).toBe('vaso doble')
    expect(nameKey('Conó')).toBe(nameKey('cono'))
  })

  it('no junta nombres distintos', () => {
    expect(nameKey('Galleta')).not.toBe(nameKey('Galletas'))
  })
})

describe('groupByName', () => {
  it('agrupa en el orden de primera aparición', () => {
    const groups = groupByName(['Vaso', 'Cono', 'vaso', 'cono ', 'Galleta'], s => s)
    expect(groups).toEqual([['Vaso', 'vaso'], ['Cono', 'cono '], ['Galleta']])
  })
})

describe('mergeByName', () => {
  it('suma el mismo producto de varias sucursales y ordena por el ranking', () => {
    const rows = [
      { name: 'cono', revenue: 1040, units: 16 },
      { name: 'Vaso', revenue: 6630, units: 102 },
      { name: 'Cono', revenue: 9620, units: 148 },
      { name: 'vaso', revenue: 975, units: 15 },
    ]
    expect(mergeByName(rows, r => r.name, ['revenue', 'units'], 'revenue')).toEqual([
      { name: 'Cono', revenue: 10660, units: 164 },
      { name: 'Vaso', revenue: 7605, units: 117 },
    ])
  })

  it('toma el nombre visible de la fila con más ventas', () => {
    const rows = [
      { name: 'vaso doble', units: 3 },
      { name: 'Vaso Doble', units: 8 },
    ]
    expect(mergeByName(rows, r => r.name, ['units'], 'units')).toEqual([{ name: 'Vaso Doble', units: 11 }])
  })
})
