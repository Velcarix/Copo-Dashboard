# 02 — Data model y BD (Prisma / PostgreSQL)

> Repo: backend (monorepo Copo, desplegado en `api.copopos.com`). Referencias de línea
> contra el snapshot `Desktop\Nueva carpeta (3)\test\backend\prisma\schema.prisma`.
>
> ⚠️ La BD de producción ya tiene la migración de pricing modes (julio 2026): `PricingMode`,
> `ProductVariant`, `CategoryFlavor`, `OrderItemFlavor`, `Product.maxFlavors`,
> `OrderItem.variantId/variantName`. Este paquete construye **encima** de eso. Bernardo
> valida el schema vivo antes de migrar.

## 1. Estado actual (lo que se reemplaza)

```prisma
// schema.prisma:285 — Product (relevante)
model Product {
  id              String  @id
  category        String            // "COMBO" para combos
  basePrice       Int
  maxFlavors      Int     @default(1)
  variants        ProductVariant[]
  comboComponents ComboComponent[] @relation("ComboProducts")   // <- modelo viejo
  partOfCombos    ComboComponent[] @relation("ComponentOf")
  // ...
}

// schema.prisma:333 — modelo viejo, fija productos hijo y prohíbe repetir componente
model ComboComponent {
  id          String  @id
  comboId     String
  componentId String
  quantity    Int     @default(1)
  @@unique([comboId, componentId])   // <- impide 3 unidades del mismo producto con distinto sabor
}
```

`ComboComponent` **no se borra** en la fase A: se migra a slots (§4) y queda como respaldo
de rollback; se deprecia después.

## 2. Modelos nuevos — slots

```prisma
enum ComboSlotSource {
  CATEGORY          // cualquier producto activo de una categoría
  SPECIFIC_PRODUCTS // lista curada de productos elegibles

  @@schema("public")
}

// Una "ranura" del combo. El combo (Product category=COMBO) tiene 1..N slots.
model ComboSlot {
  id         String          @id // ULID
  comboId    String          // productId del COMBO
  name       String          // visible al cajero: "Elige tu helado"
  quantity   Int             @default(1) // cuántas unidades hay que elegir en este slot
  source     ComboSlotSource @default(SPECIFIC_PRODUCTS)
  categoryId String?         // requerido si source=CATEGORY (FK a Category)
  sortOrder  Int             @default(0)
  active     Boolean         @default(true) // baja lógica

  combo      Product           @relation("ComboSlots", fields: [comboId], references: [id])
  category   Category?         @relation(fields: [categoryId], references: [id])
  options    ComboSlotOption[]
  orderItems OrderItem[]       @relation("OrderItemSlot") // hijos vendidos que llenaron este slot

  @@index([comboId, active])
  @@schema("public")
}

// Opción concreta de un slot SPECIFIC_PRODUCTS. No se usa en slots CATEGORY.
model ComboSlotOption {
  id         String  @id // ULID
  slotId     String
  productId  String  // producto elegible (FIXED, VARIANTS o PRESENTATION)
  priceDelta Int     @default(0) // centavos; sobreprecio opcional por elegir esta opción (RN-C02)
  sortOrder  Int     @default(0)
  active     Boolean @default(true)

  slot    ComboSlot @relation(fields: [slotId], references: [id])
  product Product   @relation("ComboSlotOptionProduct", fields: [productId], references: [id])

  @@unique([slotId, productId])
  @@index([slotId])
  @@schema("public")
}
```

Relaciones nuevas a agregar en modelos existentes:

```prisma
model Product {
  // ...existente
  comboSlots        ComboSlot[]        @relation("ComboSlots")         // si es COMBO
  comboSlotOptions  ComboSlotOption[]  @relation("ComboSlotOptionProduct") // si es elegible
}

model Category {
  // ...existente
  comboSlots ComboSlot[]  // slots que apuntan a esta categoría (source=CATEGORY)
}
```

## 3. Modelos nuevos — captura por unidad en la venta (OrderItem padre/hijo)

```prisma
model OrderItem {
  // ...existente (id, orderId, productId, quantity, unitPrice, totalPrice, note,
  //               variantId, variantName, modifiers, flavors)

  // --- combos v2 ---
  parentItemId String?     // NULL en ítems normales y en el raíz del combo; set en los hijos
  comboSlotId  String?     // qué slot llenó este hijo (solo hijos)
  parent       OrderItem?  @relation("ComboChildren", fields: [parentItemId], references: [id])
  children     OrderItem[] @relation("ComboChildren")
  comboSlot    ComboSlot?  @relation("OrderItemSlot", fields: [comboSlotId], references: [id])

  @@index([parentItemId])
  @@schema("public")
}
```

Semántica (invariantes validadas en el service, doc 03 §3):

- **Raíz de combo**: `productId` = producto COMBO, `parentItemId = NULL`,
  `totalPrice = (precioCombo + Σ deltas de hijos) × quantity`, `quantity` = nº de combos.
- **Hijo de combo**: `parentItemId` = id del raíz, `comboSlotId` set, `productId` = producto
  realmente elegido, `variantId`/`variantName` y `flavors[]` en snapshot,
  **`unitPrice = 0` y `totalPrice = 0`** (el ingreso está en el raíz — RN-C01).
- **`priceDelta` del hijo**: para trazabilidad se puede guardar el delta aplicado (de
  `ComboSlotOption.priceDelta` + premium de sabores) en un campo, pero **no** se suma en
  reportes de ingreso; ya está en el raíz. Si se quiere el campo:
  `comboChildDelta Int @default(0)` (opcional; alternativamente se deriva de los `flavors`).

> ¿Por qué filas y no un `Json comboSelections` en el raíz? Porque **todo el sistema hace
> join sobre `OrderItem`**: inventario (recetas por producto), `topProducts`/`topFlavors`,
> cocina (renderiza items), CFDI. Un JSON obligaría a reescribir todos esos caminos y perder
> la agregación SQL. Es la misma razón por la que `modos-de-cobro` hizo "las presentaciones
> son filas de `Product`". El JSON queda **descartado** (ver PENDIENTES si se reabre).

## 4. Migración y backfill

Vía `prisma migrate dev` (nunca SQL a mano para el schema). Una migración:

1. `add_combo_slots_and_order_item_parent` — enum `ComboSlotSource`, tablas `ComboSlot` y
   `ComboSlotOption`, columnas `OrderItem.parentItemId`/`comboSlotId` (nullable/default →
   deploy sin downtime), índices.

Backfill de combos existentes (script idempotente con `--dry-run`, transacción):

```
Para cada Product con category = 'COMBO':
  Para cada ComboComponent (comboId, componentId, quantity):
    crear ComboSlot {
      comboId, name = component.name, quantity = component.quantity,
      source = SPECIFIC_PRODUCTS, sortOrder incremental
    }
    crear ComboSlotOption { slotId, productId = componentId, priceDelta = 0 }
Reporte: combos migrados, slots creados, combos sin componentes (revisar a mano).
```

Resultado: cada combo viejo = varios slots con **una sola opción fija** → el cajero "elige"
lo único disponible (trivial) → comportamiento idéntico al actual. No se tocan órdenes
históricas. `ComboComponent` se conserva hasta validar; su lectura se retira en doc 03 §5.

Compatibilidad hacia atrás: `parentItemId`/`comboSlotId` nullables; POS viejo sigue mandando
combos como un solo `OrderItem` (sin hijos) y el backend lo acepta como combo "sin desglose"
(degradado) hasta que el POS se actualice. Regla operativa: no publicar combos con slots
no-triviales hasta que las cajas de la sucursal estén actualizadas.

## 5. Índices y rendimiento

- `OrderItem(parentItemId)` para reconstruir el desglose de un combo y para excluir hijos
  ($0) de las sumas de ingreso.
- `ComboSlot(comboId, active)` y `ComboSlotOption(slotId)` para serializar el combo al POS.
- Consulta dominante nueva: al armar `topFlavors`, incluir `OrderItemFlavor` de hijos — el
  índice existente `OrderItemFlavor(orderItemId)` sigue sirviendo.

## 6. Puntos a validar con Bernardo antes de ejecutar

- Forma real de `Category` en el schema desplegado (para la FK `ComboSlot.categoryId`).
- Confirmar que `OrderItem` no tiene ya alguna self-relation que choque con `ComboChildren`.
- Decidir si se guarda `comboChildDelta` en el hijo o se deriva de `flavors` + opción.
- Estrategia de baja de `ComboComponent` (cuándo se deja de leer y cuándo se dropea).
- CFDI: cómo se factura un combo con desglose — ¿una partida (el combo) o partidas por hijo?
  Recomendación: **una partida = el combo** (hereda `satProductCode/satUnitCode` del COMBO),
  los hijos son informativos. Confirmar con quien lleve facturación.
- Índices adicionales según volumen real de combos vendidos.
