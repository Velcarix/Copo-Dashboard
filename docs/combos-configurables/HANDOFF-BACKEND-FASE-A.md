# Handoff — Fase A (backend) para combos configurables

> Para: la sesión de Claude Code que trabaje `Copo/backend` con Bernardo.
> Contexto completo en `01-SPEC-FUNCIONAL.md`, `02-DATA-MODEL-BD.md`, `03-BACKEND-API.md`
> de esta misma carpeta — **léelos primero**, este doc es el punto de entrada operativo,
> no reemplaza el detalle de esos tres. Todas las reglas de negocio (`RN-C01`..`RN-C10`)
> están en `01-SPEC-FUNCIONAL.md` §2.
>
> Las sesiones de POS (`pos/`) y Dashboard (`dashboard/`) ya están construyendo contra el
> contrato de `03-BACKEND-API.md`, sin tocar BD. El POS en particular ya tiene el wiring
> completo del lado cliente (tipos, `ComboSheet`, carrito, payload de orden) esperando a
> que este backend exista — ver `pos/PLAN-EJECUCION.md` para el detalle exacto de qué ya
> está listo para consumir tu API en cuanto exista.

## 0. Los 2 bloqueantes de `PENDIENTES.md` ya están resueltos (verificado contra schema real)

Se leyó `Copo/backend/prisma/schema.prisma` directamente (no el snapshot `test/`) para
confirmar:

1. **Forma de `Category`** (`schema.prisma:263-278`): `id String @id` (ULID) — igual que
   todo lo demás en este proyecto. `ComboSlot.categoryId String? → Category.id` no tiene
   ningún problema de tipos. **Resuelto, sin acción.**
2. **Self-relation en `OrderItem`** (`schema.prisma:603-618`): hoy `OrderItem` no tiene
   ninguna relación consigo mismo. Agregar `parentItemId`/`children`/`ComboChildren` no
   choca con nada existente. **Resuelto, sin acción.**

Quedan abiertas para Bernardo (no bloquean empezar, ver `PENDIENTES.md` #3-6):
`comboChildDelta` guardado vs. derivado, estrategia de baja de `ComboComponent`, CFDI,
índices adicionales.

## 1. Qué existe hoy (punto de partida real, no el snapshot de los docs)

Los docs 02/03 anclan contra `test/backend`. El repo activo es `Copo/backend` — mismo
contenido pero **puede haber divergido** desde que se escribieron los docs. Anclas
verificadas hoy:

| Qué | Archivo:línea |
|---|---|
| `model Product` | `prisma/schema.prisma:285` |
| `model ComboComponent` (viejo, a migrar) | `prisma/schema.prisma:333` |
| `model OrderItem` | `prisma/schema.prisma:603` |
| `model Category` | `prisma/schema.prisma:263` |
| `createComboSchema` (viejo: `{ branchId, name, basePrice, components: [{productId,quantity}] }`) | `src/schemas/product.schema.ts:65` |
| `createCombo()` (viejo: crea `Product` + `ComboComponent[]` en transacción) | `src/services/product.service.ts:423` |
| Precarga de sub-productos del combo para inventario | `src/services/order.service.ts:238-249` |
| Loop de descuento de inventario por combo (viejo, recorre `product.comboComponents`) | `src/services/order.service.ts:365`, `:534`, `:593`, `:630` (4 loops explícitos; `comboComponents` también aparece incluido en queries en `:205`, `:511`, `:587`, `:626`, `:677`, `:745` — auditar todos, ver §4 abajo) |
| `topProducts` (agrega `item.totalPrice` sin filtrar hijos — hoy no hay hijos, pero cuando existan hay que excluirlos) | `src/services/report.service.ts:221-232` |

## 2. Orden de trabajo sugerido

1. **Migración Prisma** — `ComboSlot`, `ComboSlotOption`, `OrderItem.parentItemId/comboSlotId`
   (doc 02 §2-3). Vía `prisma migrate dev`, nunca SQL a mano. Nullable/default → sin downtime.
2. **Backfill** (doc 02 §4) — script idempotente con `--dry-run`: cada `ComboComponent`
   existente se vuelve un `ComboSlot` con una sola `ComboSlotOption`. No tocar
   `ComboComponent` todavía (se conserva como respaldo).
3. **Schema Zod nuevo** (doc 03 §1) — reemplaza `createComboSchema` de
   `product.schema.ts:65` (slots en vez de `components` planos). Mantener
   `updateComboSchema` como `.partial({ branchId: true })`.
4. **`product.service.createCombo`** (`product.service.ts:423`) — hoy crea
   `Product + ComboComponent[]` en una transacción; reescribir para crear
   `Product + ComboSlot[] + ComboSlotOption[]` (doc 03 §1, validaciones incluidas: no
   anidar combos, `productId`/`categoryId` del mismo `branchId`, `EMPTY_CATEGORY_SLOT`
   warning). Agregar `updateCombo` equivalente (edición con bajas lógicas).
5. **Serialización** (`GET /api/v1/products`) — para productos `COMBO`, incluir
   `comboSlots[].options[]` ya expandidos (doc 03 §2, ejemplo JSON completo ahí). Para
   `source=CATEGORY`, expandir a los productos activos de la categoría con
   `priceDelta: 0` + `pricingMode`/`maxFlavors`. **Esto es lo único que el POS necesita
   para activarse** — en cuanto este endpoint mande `comboSlots`, `ComboSheet` empieza a
   abrirse solo (`order.tsx`: `if (product.category === 'COMBO' && product.comboSlots?.length)`).
6. **Venta: validación + explosión** (doc 03 §3) — en `order.service.ts` (la función que
   procesa `validated.items`, ver precarga en `:190-260`): por cada item con
   `productId` = combo y payload `combo.children`, validar contra `comboSlots.options` y
   crear el `OrderItem` raíz + hijos según doc 03 §3 pasos 1-6. Errores nuevos:
   `SLOT_OPTION_INVALID`, `SLOT_QUANTITY_MISMATCH`, `COMBO_NESTED_NOT_ALLOWED`,
   `VARIANT_REQUIRED`, `FLAVORS_REQUIRED`, `FLAVORS_EXCEED_MAX`, `FLAVOR_SOLD_OUT`,
   `PRICE_MISMATCH` (warning). El POS ya manda `combo.children` en el payload en los 3
   flujos de creación de orden (pago junto, separado, edición) — no falta nada de su lado.
7. **Inventario por hijo** (doc 03 §4) — hay **4 loops explícitos**
   `for (const comp of product.comboComponents)` en `order.service.ts` (líneas `365`,
   `534`, `593`, `630` — probablemente una por combinación de ruta online/offline/replay
   de inventario; confirmar antes de tocar) más otras 6 apariciones de
   `comboComponents` como `include`/tipo en queries (`205`, `511`, `587`, `626`, `677`,
   `745`) que alimentan esos loops o lógica relacionada — grep `comboComponents` en el
   archivo completo antes de asumir que son solo los 4 loops obvios. Cambiar cada uno a
   recorrer los `OrderItem` hijos reales y su `recipe`, multiplicando por `child.quantity`.
8. **Reportes** (doc 03 §5) —
   - `report.service.ts:221-232` (`topProducts`): agregar filtro `parentItemId IS NULL`
     a la query/loop que suma `item.totalPrice` — **si no se hace, en cuanto existan
     hijos con `totalPrice=0` no rompe el número pero sí puede inflar el conteo de
     "productos distintos vendidos" con entradas $0**; revisar también si
     `variantAgg`/`extrasAgg` (mismo archivo, loop `orders.forEach` inmediatamente
     debajo) deben excluir hijos igual que `topProducts` (revenue) o no (unidades).
   - `topFlavors`: sí debe incluir sabores de hijos de combo (RN-C01) — confirmar que
     el join a `OrderItemFlavor` no filtra por `parentItemId`.
   - `GET /api/v1/orders/:id`: anidar `children[]` bajo el raíz para el detalle admin
     — el POS también lo necesita para `PUT /orders/:id` (edición desde historial).
9. **Kitchen** (`GET /api/v1/kitchen/orders`, ver `Copo/CLAUDE.md` — hay una feature
   activa `001-modulo-cocina` en `.specify/` sobre este mismo módulo, revisar que no
   choque) — decidir y documentar la forma en que `children[]` viaja en la respuesta de
   cocina. El POS **no puede** mostrar el desglose en la pantalla de cocina hasta que
   esto exista y quede documentado (ver `pos/PLAN-EJECUCION.md` §Pendiente #3) — avisar
   a la sesión de POS en cuanto esto esté definido para que lo consuma.

## 3. Qué NO hacer

- No dropear `ComboComponent` todavía (respaldo de rollback, doc 02 §4).
- No aceptar el precio de la variante dentro de un combo como cobrable — es flat,
  RN-C05 (descartado explícitamente en `PENDIENTES.md`).
- No confiar en el total que manda el cliente — recalcular siempre server-side (doc 03 §3.3).
- No usar SQL a mano para el schema — solo `prisma migrate dev`.

## 4. Cómo avisar que Fase A está lista

Actualizar este doc (o `PENDIENTES.md`) con la fecha y qué endpoints quedaron activos.
Las sesiones de POS y Dashboard están esperando ese aviso para conectar contra el
backend real y probar de extremo a extremo — hoy no hay forma de probarlo porque no
existe ningún ambiente con Fase A desplegada.
