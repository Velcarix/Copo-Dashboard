# 03 — Backend API (Express / Prisma / Zod)

> Repo backend (monorepo Copo). Anclas contra `backend/src` del snapshot `test`:
> `services/product.service.ts` (`createCombo` ~línea 423), `schemas/product.schema.ts`
> (`createComboSchema` línea 65), `services/order.service.ts` (creación de orden e
> inventario, loop de combo ~línea 254), `services/report.service.ts` (`topProducts`).
> Reglas del proyecto: montos en centavos; sin `any`; errores `{ error: { code, message } }`;
> logger de `backend/src/lib/logger.ts`.

## 1. Crear / editar combo con slots

Reemplaza `createComboSchema` (hoy solo acepta `{ productId, quantity }[]`):

```ts
// schemas/product.schema.ts
const comboSlotOptionSchema = z.object({
  productId:  z.string().min(1),
  priceDelta: z.number().int().min(0).default(0),
})

const comboSlotSchema = z.object({
  name:       z.string().min(1).max(60),
  quantity:   z.number().int().min(1).max(20),
  source:     z.enum(['CATEGORY', 'SPECIFIC_PRODUCTS']),
  categoryId: z.string().min(1).optional(),          // requerido si source=CATEGORY
  options:    z.array(comboSlotOptionSchema).default([]), // requerido(>=1) si SPECIFIC_PRODUCTS
}).refine(s => s.source !== 'CATEGORY' || !!s.categoryId, {
  message: 'categoryId requerido para slots de categoría', path: ['categoryId'],
}).refine(s => s.source !== 'SPECIFIC_PRODUCTS' || s.options.length >= 1, {
  message: 'Un slot de productos específicos necesita al menos una opción', path: ['options'],
})

export const createComboSchema = z.object({
  branchId:  z.string().min(1),
  name:      z.string().min(1).max(100),
  basePrice: z.number().int().min(1),                // RN-C10: > 0
  imageLocalPath: z.string().optional().nullable(),
  slots:     z.array(comboSlotSchema).min(1),
}).refine(c => c.slots.reduce((n, s) => n + s.quantity, 0) >= 2, {
  message: 'Un combo debe sumar al menos 2 unidades', path: ['slots'],   // RN-C09
})

export const updateComboSchema = createComboSchema.partial({ branchId: true })
```

Validaciones adicionales en `product.service` al crear/editar:

- Todos los `productId` (opciones) y `categoryId` (slots) pertenecen al `branchId`.
- Ningún producto elegible tiene `category = 'COMBO'` (no se anidan combos — RN §6).
- Para `source=CATEGORY`, la categoría existe y tiene ≥ 1 producto activo (si no, warning
  `EMPTY_CATEGORY_SLOT`, no bloquea guardar pero marca el combo "incompleto").
- Persistir en transacción: `Product(category=COMBO)` + `ComboSlot[]` + `ComboSlotOption[]`.
  En edición, aplicar bajas lógicas (`active=false`) a slots/opciones referenciados por
  órdenes; borrar los nunca usados.

Endpoints:

```
POST /api/v1/products/combo         body: createComboSchema
PUT  /api/v1/products/combo/:id     body: updateComboSchema
GET  /api/v1/products/:id           combo serializado con slots (para dashboard)
```

## 2. Serialización del combo para el POS

`GET /api/v1/products` (y el bootstrap offline) debe incluir, para productos COMBO, sus
slots resueltos con las opciones ya expandidas (para que el POS no tenga que cruzar
catálogos):

```jsonc
{
  "id": "cmb_...", "category": "COMBO", "basePrice": 15000, "name": "3 Helados 3x2",
  "comboSlots": [
    {
      "id": "slot_...", "name": "Elige tu helado", "quantity": 3, "source": "CATEGORY",
      "categoryId": "cat_helados",
      "options": [   // expandido desde la categoría: presentaciones activas
        { "productId": "p_cono", "name": "Cono", "pricingMode": "PRESENTATION",
          "maxFlavors": 1, "priceDelta": 0 },
        { "productId": "p_vaso", "name": "Vaso", "pricingMode": "PRESENTATION",
          "maxFlavors": 2, "priceDelta": 0 },
        { "productId": "p_litro", "name": "Litro", "pricingMode": "PRESENTATION",
          "maxFlavors": 4, "priceDelta": 0 }
      ]
    }
  ]
}
```

- Para `source=SPECIFIC_PRODUCTS`, `options` sale de `ComboSlotOption` (con su `priceDelta`).
- Para `source=CATEGORY`, el backend expande a los productos activos de la categoría con
  `priceDelta: 0`, e incluye `pricingMode`/`maxFlavors` para que el POS sepa si pedir
  sabores o variante. Los sabores del catálogo ya viajan por `GET /categories/:id/flavors`
  (cacheado en Dexie); no se duplican aquí.

## 3. Venta: validación y explosión en OrderItems

Payload de orden para un combo (POS → `POST /api/v1/orders` y bulk sync):

```jsonc
{
  "productId": "cmb_...", "quantity": 1,
  "combo": {
    "children": [
      { "slotId": "slot_...", "productId": "p_litro", "variantId": null,
        "flavors": [ { "flavorId": "f_mango", "quantity": 2 },
                     { "flavorId": "f_pistache", "quantity": 2 } ] },
      { "slotId": "slot_...", "productId": "p_cono",
        "flavors": [ { "flavorId": "f_choco", "quantity": 1 } ] },
      { "slotId": "slot_...", "productId": "p_vaso",
        "flavors": [ { "flavorId": "f_vainilla", "quantity": 1 } ] }
    ]
  }
}
```

El service (`order.service`):

1. Carga el combo con `comboSlots.options`. Valida por cada slot que se recibieron
   exactamente `quantity` hijos y que cada `productId` es elegible en ese slot
   (`SLOT_OPTION_INVALID`).
2. Por hijo PRESENTATION: `1 <= Σ flavors.quantity <= maxFlavors` (`FLAVORS_REQUIRED` /
   `FLAVORS_EXCEED_MAX`); ningún sabor `soldOut` (`FLAVOR_SOLD_OUT`, excepción replay offline
   por `createdAt`, igual que modos-de-cobro). Por hijo VARIANTS: `variantId` presente y
   activo (`VARIANT_REQUIRED`).
3. **Recalcula el precio en el backend** (nunca confía en el cliente):
   `total = basePrice + Σ(option.priceDelta de cada hijo) + Σ(CategoryFlavor.priceDelta ×
   qty de sabores premium)`. Si difiere de lo que mandó el POS → `logger.warn` +
   `PRICE_MISMATCH` (no rechaza en replay offline; se respeta lo cobrado — RN §6).
4. Crea el `OrderItem` **raíz**: `productId=combo`, `parentItemId=null`,
   `totalPrice = total × quantityCombo`.
5. Crea un `OrderItem` **hijo** por cada elemento de `combo.children`:
   `parentItemId=raiz.id`, `comboSlotId=slotId`, `productId` elegido, `variantId/variantName`
   y `flavors[]` en snapshot, `unitPrice=0`, `totalPrice=0`, `quantity = quantityCombo`
   (para que el inventario descuente por el nº de combos).
6. **Invariante dura** (test): todo `OrderItem` con `parentItemId != null` tiene
   `totalPrice = 0`. Ningún guardrail anti-$0 aplica a hijos de combo.

Errores nuevos (todos con forma `{ error: { code, message } }`):
`SLOT_OPTION_INVALID`, `SLOT_QUANTITY_MISMATCH`, `COMBO_NESTED_NOT_ALLOWED`,
`VARIANT_REQUIRED`, `FLAVORS_REQUIRED`, `FLAVORS_EXCEED_MAX`, `FLAVOR_SOLD_OUT`,
`PRICE_MISMATCH` (warning, no bloquea offline).

## 4. Inventario por hijo (cambia el loop actual)

Hoy `order.service` (~línea 254) descuenta inventario recorriendo
`product.comboComponents` (la definición fija). Con slots eso ya no aplica: **el descuento
debe recorrer los `OrderItem` hijos reales** y usar `subProduct.recipe` del producto
elegido, multiplicando por `child.quantity` (= nº de combos). Así se descuenta lo que de
verdad se sirvió (litro de mango, no una lista fija). Mantener el mismo manejo de
`inventoryConflict` que hoy.

## 5. Reportes

- `topProducts` (suma `OrderItem.totalPrice` por `productId`): **debe excluir hijos**
  (`parentItemId IS NULL`) para no sumar $0 basura ni romper el group-by. El combo aparece
  con su ingreso correcto. Revisar la query en `report.service.ts` y agregar el filtro.
- `topFlavors` (cuenta `OrderItemFlavor.quantity`): **incluir** los de hijos de combo — así
  los sabores vendidos dentro de combos cuentan en unidades (RN-C01). Ya funciona por join a
  `OrderItem`; solo confirmar que no filtra por `parentItemId`.
- Detalle de orden (`GET /api/v1/orders/:id`): devolver los hijos anidados bajo el raíz
  (`children[]`) para que el admin muestre el desglose (solo lectura).
- Nice-to-have: `comboAttach` / mix de presentaciones dentro de combos (conteo por
  `productId`/`variantId` de hijos). Fase D, opcional.

## 6. Compatibilidad y despliegue

- Campos nuevos nullable → deploy sin downtime; combos viejos migrados venden igual.
- POS viejo (sin `combo.children`): el backend crea solo el raíz (combo "sin desglose"),
  descuenta inventario por el backfill de slots si existe, o degradado. No se habilitan
  combos con slots no-triviales hasta actualizar cajas (regla operativa).
- Orden de trabajo: **este doc (backend) va primero**; dashboard (04) y POS (05) consumen
  estos contratos y se pueden hacer en sesiones separadas.
