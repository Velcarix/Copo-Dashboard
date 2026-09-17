import { describe, test, expect } from 'vitest'
import { normalizeOption } from '../../apps/dashboard/pages/ProductsPage'
import type { ModifierOptionConfig } from '../../types'

// B-04: el backend devuelve el modo como enum en MAYUSCULAS y los insumos como
// filas de IngredientAdjustment (sin nombre ni unidad). El editor compara contra
// minusculas y pinta name/unit — sin este puente, reabrir un producto muestra la
// config de inventario vacia aunque en la BD si este guardada.
describe('normalizeOption', () => {
  const apiOption = {
    id: 'opt-1',
    groupId: 'grp-1',
    name: 'Con topping',
    priceDelta: 0,
    sortOrder: 0,
    ingredientMode: 'CUSTOM',
    ingredientAdjustments: [
      { id: 'adj-1', inventoryItemId: 'inv-1', quantity: '30', inventoryItem: { name: 'Chispas', unit: 'grams' } },
    ],
  } as unknown as ModifierOptionConfig

  test('pasa el modo del enum del backend al que usa el editor', () => {
    expect(normalizeOption(apiOption).ingredientMode).toBe('custom')
  })

  test('denormaliza nombre y unidad del insumo para la fila del editor', () => {
    const [adj] = normalizeOption(apiOption).ingredientAdjustments ?? []
    expect(adj).toMatchObject({ inventoryItemId: 'inv-1', name: 'Chispas', quantity: 30, unit: 'g' })
  })

  test('deja intacta una opcion que ya viene en el shape del editor', () => {
    const local = {
      ...apiOption,
      ingredientMode: 'custom',
      ingredientAdjustments: [{ id: 'a', inventoryItemId: 'inv-1', name: 'Chispas', quantity: 30, unit: 'g' }],
    } as unknown as ModifierOptionConfig
    expect(normalizeOption(local)).toEqual(local)
  })

  test('una opcion sin config de inventario queda sin modo y sin insumos', () => {
    const plain = { ...apiOption, ingredientMode: undefined, ingredientAdjustments: undefined } as unknown as ModifierOptionConfig
    const out = normalizeOption(plain)
    expect(out.ingredientMode).toBeUndefined()
    expect(out.ingredientAdjustments).toEqual([])
  })
})
