# 02 — Data model y BD (Prisma / PostgreSQL)

> Repo: backend (monorepo Copo, desplegado en api.copopos.com). Referencias de línea
> contra el snapshot local `Desktop\Copo\backend\prisma\schema.prisma` del 2026-07-03.
>
> ⚠️ **Antes de migrar**: el snapshot local NO tiene la tabla/ruta de categorías que el
> frontend ya consume (`GET /api/v1/categories`, ver `categoryStore.ts:57`). Bernardo debe
> aplicar estos cambios sobre el schema real desplegado, no sobre el snapshot.

## 1. Fase 0 — Backfill de `totalPrice` (sin cambio de schema)

El schema ya declara la semántica correcta (`OrderItem.totalPrice` línea 429:
"unitPrice × quantity + modificadores") pero el service la incumple. Tras corregir el
código (doc 03 §1), correr una sola vez:

```sql
-- Corrige órdenes históricas cuyo totalPrice omitió modificadores
UPDATE "OrderItem" oi
SET "totalPrice" = (oi."unitPrice" + m.delta) * oi."quantity"
FROM (
  SELECT "orderItemId", SUM("priceDelta") AS delta
  FROM "OrderItemModifier"
  GROUP BY "orderItemId"
) m
WHERE m."orderItemId" = oi."id"
  AND oi."totalPrice" <> (oi."unitPrice" + m.delta) * oi."quantity";
```

Verificación: para un rango de fechas, `SUM(OrderItem.totalPrice)` por orden debe cuadrar
con `Order.totalAmount + discountAmount - tipAmount` (revisar signo de descuentos según
cómo lo guarde el POS antes de asumir la fórmula exacta). `Order.totalAmount` NO se toca.

## 2. Fase 1 — `pricingMode` y variantes

```prisma
enum PricingMode {
  FIXED
  VARIANTS
  PRESENTATION

  @@schema("public")
}

// En la tabla Category existente del backend desplegado
model Category {
  // ...campos actuales (id, key, name, emoji, color, sortOrder, hidden, branchId…)
  pricingMode   PricingMode @default(FIXED)
  variantScheme Json?       // ["Chico","Mediano","Grande"] — solo VARIANTS
  flavors       CategoryFlavor[]  // fase 2
}

model ProductVariant {
  id                   String    @id // ULID, consistente con el resto del schema
  productId            String
  name                 String    // viene del esquema de la categoría; editable por producto
  price                Int       // centavos, ABSOLUTO (no delta)
  sortOrder            Int       @default(0)
  active               Boolean   @default(true)
  ingredientMultiplier Float?    // escala la receta base (mismo concepto que ModifierOption.MULTIPLY)
  deliverectPlu        String?   // paridad con Product/ModifierOption para mapeo Deliverect
  product              Product   @relation(fields: [productId], references: [id])
  orderItems           OrderItem[]

  @@index([productId])
  @@schema("public")
}
```

Cambios en modelos existentes:

```prisma
model Product {
  // ...existente (línea 133)
  maxFlavors Int              @default(1)  // solo relevante en categorías PRESENTATION
  variants   ProductVariant[]
}

model OrderItem {
  // ...existente (línea 423)
  variantId   String?           // FK a ProductVariant
  variantName String?           // snapshot al momento de la venta (como optionName)
  variant     ProductVariant?   @relation(fields: [variantId], references: [id])
  flavors     OrderItemFlavor[] // fase 2
}
```

## 3. Fase 2 — Catálogo de sabores

```prisma
model CategoryFlavor {
  id              String  @id // ULID
  categoryId      String
  name            String
  priceDelta      Int     @default(0) // centavos; sabor premium opcional (RN-08)
  soldOut         Boolean @default(false) // "agotado hoy" — toggle rápido
  active          Boolean @default(true)  // baja lógica permanente
  sortOrder       Int     @default(0)
  inventoryItemId String? // descuento por sabor — fase posterior, detrás de flag
  category        Category          @relation(fields: [categoryId], references: [id])
  orderItemFlavors OrderItemFlavor[]

  @@index([categoryId])
  @@schema("public")
}

model OrderItemFlavor {
  id          String         @id // ULID
  orderItemId String
  flavorId    String
  flavorName  String         // snapshot (mismo patrón que OrderItemModifier.optionName, línea 441)
  quantity    Int            @default(1) // "doble mango" = quantity 2
  priceDelta  Int            @default(0) // snapshot del premium al momento de la venta
  orderItem   OrderItem      @relation(fields: [orderItemId], references: [id])
  flavor      CategoryFlavor @relation(fields: [flavorId], references: [id])

  @@index([orderItemId])
  @@schema("public")
}
```

Invariante en PRESENTATION: `SUM(OrderItemFlavor.quantity) BETWEEN 1 AND Product.maxFlavors`
por ítem — se valida en el service (doc 03 §4), no como constraint SQL.

## 4. Migraciones

Vía `prisma migrate dev` (nunca a mano), una migración por fase:

1. `add_pricing_mode_and_variants` — enum + columnas Category + tabla ProductVariant +
   columnas OrderItem (`variantId`, `variantName`). Todo nullable/default → deploy sin downtime.
2. `add_category_flavors` — tablas CategoryFlavor y OrderItemFlavor + `Product.maxFlavors`.

Compatibilidad: apps viejas (POS offline sin actualizar) siguen mandando payloads sin
`variantId`/`flavors`; solo las categorías que un dueño cambie de modo exigen los campos
nuevos. Regla operativa: no cambiar el modo de una categoría hasta que las cajas de esa
sucursal tengan la app actualizada.

## 5. Script de migración del cliente piloto (asistido, fase 2)

Entrada: `branchId`. Pasos (transacción, con dry-run que imprime el plan):

1. Detectar categorías candidatas: ≥80% de sus productos con `basePrice = 0` y todos con
   grupos SELECT/SIZE cuyas opciones tienen `priceDelta > 0`.
2. Por categoría confirmada: `pricingMode = PRESENTATION`.
3. Unión de opciones de esos grupos → filas nuevas de `Product` (presentaciones):
   `name = "{grupo} {opción}"` normalizado ("Cono sencillo"), `basePrice = priceDelta`,
   `maxFlavors` según regla del cliente (capturado en el dry-run, no inferible).
4. Productos originales (Vainilla, Mango…) → `CategoryFlavor` (mismo orden); luego
   `active = false` en los productos originales (no borrar: órdenes históricas los referencian).
5. Desactivar el producto-workaround "Presentación" (16 grupos).
6. Reporte final: qué se creó, qué se desactivó, qué requiere revisión manual.

## 6. Puntos a validar con Bernardo antes de ejecutar

- Forma real de la tabla Category en el schema desplegado (campos, relación con Branch).
- Si `ProductCategory` (enum, línea 174) sigue vivo en paralelo a la tabla Category —
  el spec asume que la tabla es la fuente de verdad y el enum es legacy.
- Convención de IDs en tablas nuevas (el schema actual usa ULID).
- Facturación CFDI: las presentaciones heredan `satProductCode/satUnitCode` del producto —
  confirmar que ninguna factura requiere código por variante.
- Índices adicionales según volumen real de `OrderItemFlavor` (consulta dominante:
  agregación por rango de fechas para `topFlavors`).
