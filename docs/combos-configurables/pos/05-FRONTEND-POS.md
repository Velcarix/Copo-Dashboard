# 05 — Frontend POS: ComboSheet y venta de combos configurables

> Repo `Copo` (mobile Expo + Electron). Anclas contra el snapshot `test/mobile`:
> `app/(pos)/order.tsx` (`handleProductTap` línea 516, `handleModifierConfirm` línea 527),
> `components/pos/ModifierSheet.tsx` (patrón `buildSections` 31-43, `FlavorPicker`,
> selector de variante 302-345, `canConfirm`), `store/posStore.ts`
> (`ProductWithModifiers.comboComponents` línea 14), `store/cartStore.ts` (`addItem` 123,
> firma por `variantId`+`flavorsKey` 132-134). Reusar, no reinventar.

## 1. Idea general

Hoy `handleProductTap` abre `ModifierSheet` si el producto tiene modifier groups, opciones
de combo (viejo) o necesita variante/sabor. Para combos v2 abrimos un **`ComboSheet`**
dedicado: es un wizard que recorre las unidades de cada slot y, por unidad, **reusa los
mismos pickers** que un producto suelto (grid de producto, `FlavorPicker`, radio de
variante). El resultado es un `CartItem` de combo con `comboChildren[]`.

```ts
// order.tsx handleProductTap
function handleProductTap(product: ProductWithModifiers) {
  if (product.category === 'COMBO') { setComboProduct(product); return }   // <- nuevo
  const hasComboOptions = ... // (camino viejo, se retira cuando el backfill migre todo)
  const needsVariantOrFlavor = product.pricingMode === 'VARIANTS' || 'PRESENTATION'
  if (product.modifierGroups.length || hasComboOptions || needsVariantOrFlavor) setModifierProduct(product)
  else useCartStore.getState().addItem(product, [])
}
```

## 2. Tipos

```ts
// @/types/shared
export interface ComboSlotOptionConfig {
  productId: string; name: string
  pricingMode: 'FIXED' | 'VARIANTS' | 'PRESENTATION'
  maxFlavors: number; priceDelta: number
  variants?: ProductVariant[]        // si VARIANTS
  categoryId: string                 // para ubicar el catálogo de sabores
}
export interface ComboSlotConfig {
  id: string; name: string; quantity: number
  source: 'CATEGORY' | 'SPECIFIC_PRODUCTS'
  categoryId?: string
  options: ComboSlotOptionConfig[]   // ya expandidas por el backend (doc 03 §2)
}

// selección hecha por el cajero, por unidad
export interface CartComboChild {
  slotId: string
  productId: string; productName: string
  variantId?: string; variantName?: string
  flavors?: CartItemFlavor[]
  priceDelta: number                 // option.priceDelta + Σ premium de sabores (informativo)
}

// CartItem += 
export interface CartItem {
  // ...existente (localId, productId, productName, quantity, unitPrice, modifiers, flavors…)
  comboChildren?: CartComboChild[]
}
```

`ProductWithModifiers` (`posStore.ts`) += `comboSlots?: ComboSlotConfig[]`.

## 3. ComboSheet — estructura

```
ComboSheet(product)
 ├─ construye "unidades" = flatMap(slots, s => repeat(s, s.quantity))
 │    → [{slot, index:1, of:3}, {slot, index:2, of:3}, {slot, index:3, of:3}, ...]
 ├─ estado: selections: Record<unitKey, CartComboChild | null>
 ├─ render: acordeón/stepper; unidad activa muestra:
 │    1) grid de opciones del slot (option.name; si CATEGORY, las presentaciones)
 │    2) al elegir opción:
 │         - PRESENTATION → <FlavorPicker flavors={flavorsByCategory[option.categoryId]}
 │                                        maxFlavors={option.maxFlavors} .../>
 │         - VARIANTS     → radio de option.variants (precio NO se muestra como precio del
 │                          ítem; es flat — RN-C05; opcional: ocultar precios de variante)
 │         - FIXED        → sin paso extra
 │    3) marca la unidad como resuelta y avanza
 ├─ atajos: "Repetir anterior" (copia la última selección del mismo slot),
 │           recordar última presentación elegida como default del grid
 ├─ total en vivo = product.basePrice + Σ selections.priceDelta
 └─ canConfirm = todas las unidades resueltas (cada una con producto y, si aplica,
                 1..maxFlavors sabores o variante elegida)
```

Reusos concretos:
- `FlavorPicker.tsx` tal cual (ya soporta contador, repetición, agotados, premium "+$").
- El bloque de radio de variante de `ModifierSheet.tsx` (302-339) se extrae a un pequeño
  `VariantRadio` reutilizable, o se copia su patrón dentro de `ComboSheet`.
- `flavorsByCategory` del `posStore` (ya existe) para poblar el `FlavorPicker` por opción.

## 4. Confirmar → carrito

```ts
function handleComboConfirm(children: CartComboChild[]) {
  useCartStore.getState().addComboItem(comboProduct, children)  // nuevo método
  setComboProduct(null)
}
```

`cartStore`:
- `addComboItem(combo, children)`: crea `CartItem` con `unitPrice = combo.basePrice`,
  `comboChildren = children`. La **firma de deduplicación** se extiende a incluir un hash de
  `comboChildren` (slotId + productId + variantId + flavorsKey por hijo, ordenados); combos
  idénticos se agrupan, distintos quedan en líneas separadas.
- Total de línea = `(unitPrice + Σ child.priceDelta) × quantity`. Debe cuadrar con el backend
  o el backend responde `PRICE_MISMATCH` (warning; se respeta lo cobrado offline).

`CartItemRow`: título = nombre del combo + total; subtexto expandible con las unidades:
`"Litro · mango ×2, pistache ×2 · Cono · chocolate · Vaso · vainilla"`.

## 5. Payload de orden

```jsonc
{ "productId": "<comboId>", "quantity": 1,
  "combo": { "children": [
    { "slotId": "...", "productId": "<litro>", "flavors": [
        {"flavorId":"...","quantity":2},{"flavorId":"...","quantity":2} ] },
    { "slotId": "...", "productId": "<cono>", "flavors": [ {"flavorId":"...","quantity":1} ] },
    { "slotId": "...", "productId": "<vaso>", "flavors": [ {"flavorId":"...","quantity":1} ] }
  ] } }
```

Manejo de errores del backend (doc 03 §3): mostrar mensaje claro y mantener el combo en el
sheet para corregir; `FLAVOR_SOLD_OUT` deshabilita ese sabor; `PRICE_MISMATCH` no bloquea.

## 6. Offline (Dexie / sync)

- **Bump de versión de Dexie** (`db.ts`): el store de productos ahora embebe `comboSlots`
  (con opciones y `maxFlavors`/`pricingMode`). Migración de versión IndexedDB que rellena el
  campo nuevo sin invalidar cachés viejos.
- Los sabores ya se cachean (`GET /categories/:id/flavors`) desde modos-de-cobro; el
  `ComboSheet` los lee de ahí — funciona sin internet.
- `sync.ts`: serializar `combo.children` en la orden encolada. Órdenes viejas (sin combo v2)
  siguen sincronizando. Last-write-wins para toggles de agotado (ya existente).

## 7. Edición de combo desde el historial

El flujo de edición del POS (ver CLAUDE.md del proyecto) debe poder recargar un combo con
sus `comboChildren` en el `ComboSheet` para modificarlo. Al guardar, `PUT /orders/:id`
recibe el `combo.children` actualizado; el backend reexpande hijos y recalcula (el raíz lleva
el badge "Editado" que ya existe en cocina).

## 8. Cocina y ticket

- Pantalla de cocina y ticket impreso: renderizar el combo como encabezado + lista de sus
  unidades con presentación y sabores ("COMBO 3×2 → 1) Litro mango/pistache 2) Cono choco
  3) Vaso vainilla"). La cocina necesita el desglose para preparar; hoy solo vería el nombre
  del combo.
- Reusar el desglose de `comboChildren` (POS) o `children[]` de la orden (sincronizada).

## 9. Tests
- Unit: `ComboSheet` con 1 slot quantity 3 exige 3 unidades resueltas; `canConfirm` correcto.
- Unit: opción PRESENTATION exige 1..maxFlavors; VARIANTS exige variante; FIXED sin paso.
- Unit: `cartStore` agrupa combos idénticos y separa distintos (firma con desglose).
- Integración (Playwright/Detox donde aplique): vender "3×2" con 3 sabores distintos y
  verificar payload `combo.children` + total.
- Regresión: combo migrado (1 opción por slot) se agrega con selección trivial.
