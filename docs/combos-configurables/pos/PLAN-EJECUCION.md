# Plan de ejecución — sesión POS (combos v2)

> Sesión: Claude Code sobre `Copo-Dashboard` (planeación) + `Copo/mobile` (implementación).
> Fecha: 2026-08-16. No se tocó BD ni backend — eso es exclusivo de Bernardo.
> Este doc registra qué se implementó ya (sin esperar a Bernardo) y qué queda
> pendiente porque depende de la Fase A (backend). Ver `../PENDIENTES.md` para
> las decisiones abiertas de producto/backend.

## Correcciones a `05-FRONTEND-POS.md` / `README.md` (importante para quien siga)

El código real de `Copo/mobile` no coincide con dos supuestos de los docs originales:

1. **No hay Dexie/IndexedDB.** El offline es `expo-sqlite` (nativo) con fallback a
   `localStorage` vía `lib/webStore.ts` (Electron/web) — todo detrás de `lib/db.ts`,
   `lib/offlineState.ts` (caché de catálogo) y `lib/offlineQueue.ts` (cola de órdenes,
   tabla `pending_orders` con el `CreateOrderDto` completo como JSON). Como el catálogo
   se cachea como JSON plano, agregar `comboSlots` a `ProductWithModifiers` **no
   requiere migración** de ningún tipo — viaja solo. No existe "sync.ts"; la
   orquestación vive en `store/syncStore.ts` + `lib/offlineQueue.ts`.
2. **No hay `src/types.ts`.** Los tipos compartidos están en `Copo/shared/types/index.ts`,
   re-exportados en `mobile/types/shared.ts` (`export * from '../../shared/types/index'`).

## Hecho en esta sesión (sin esperar a Bernardo)

Todo esto es aditivo y queda inerte (no cambia comportamiento actual) hasta que el
backend empiece a mandar `product.comboSlots` — verificado con `npx tsc --noEmit`
sin errores sobre todo `Copo/mobile`.

### C0 — Tipos (`Copo/shared/types/index.ts`)
- `ComboSlotOptionConfig`, `ComboSlotConfig`, `CartComboChild` (junto a `ComboComponentConfig`).
- `CartItem.comboChildren?: CartComboChild[]`.
- `CreateOrderComboChildDto` + `CreateOrderItemDto.combo?: { children: CreateOrderComboChildDto[] }`.
- `ProductWithModifiers.comboSlots?: ComboSlotConfig[]` en `mobile/store/posStore.ts`.

### C1 — `ComboSheet` (`mobile/components/pos/ComboSheet.tsx`, nuevo)
- Wizard por unidad: construye `units = flatMap(comboSlots, slot => repeat(slot.quantity))`,
  header de progreso tocable (chips por unidad, salta a cualquiera para corregir).
- Por unidad: grid de opciones del slot → si `PRESENTATION` reusa `FlavorPicker` tal
  cual; si `VARIANTS` reusa el nuevo `VariantRadio` (ver abajo) con `showPrices={false}`
  (RN-C05, la variante no se cobra dentro del combo); si `FIXED` resuelve directo.
- "↺ Repetir anterior": copia la última selección resuelta del mismo slot.
- Total en vivo = `basePrice + Σ priceDelta` de las unidades resueltas.
- `canConfirm` = todas las unidades tienen selección.
- Extraído `VariantRadio.tsx` desde el bloque de variante de `ModifierSheet.tsx` (antes
  líneas ~302-338) para reusarlo en ambos sheets — `ModifierSheet.tsx` quedó refactorizado
  para usarlo también (mismo comportamiento, cero cambio visual).

### C2 — Carrito (`mobile/store/cartStore.ts`, `mobile/components/pos/CartItemRow.tsx`)
- `addComboItem(combo, children)`: crea `CartItem` con `unitPrice = combo.basePrice` y
  `comboChildren`. Dedup con `comboChildrenKey()` (hash slotId+productId+variantId+sabores,
  ordenado) — combos idénticos se agrupan, distintos quedan en líneas separadas.
- `computeTotals` y `getGuestPaymentSummary` (que duplicaba la fórmula) actualizados con
  `comboChildrenExtra()` para no perder el delta de combo en subtotales/pago separado.
- `loadOrderForEdit` preserva `comboChildren` al recargar una orden para editar.
- `CartItemRow`: desglose expandible (tap para ver completo) bajo el nombre del combo.

### `order.tsx` (wiring)
- `handleProductTap`: si `product.category === 'COMBO' && product.comboSlots?.length`
  → abre `ComboSheet` (nuevo). Si no (combo viejo o aún sin `comboSlots` porque el
  backend no lo manda todavía) → sigue el camino actual con `ModifierSheet`, sin cambios.
  **Esta es la razón por la que todo lo anterior es seguro de mergear ya**: hasta que
  Bernardo entregue Fase A, `comboSlots` nunca llega, así que el `if` nunca se activa.
- `handleComboConfirm` → `cartStore.addComboItem`.
- `<ComboSheet key={comboProduct?.id ?? 'none-combo'} .../>` renderizado junto a `ModifierSheet`.

### Payload de orden y tickets (los 3 lugares que construyen `CreateOrderItemDto` desde el carrito)
- `components/pos/PaymentModal.tsx` (pago TOGETHER) — `items.map(...)` += `combo.children`.
- `app/(pos)/order.tsx` `submitGuestOrder` (pago SEPARATE) — `items.map(...)` += `combo.children`.
- `app/(pos)/order.tsx` `saveEdit` (`PUT /orders/:id`) — `allItems.map(...)` += `combo.children`.
- `app/(pos)/history.tsx` `handleEdit`: el tipo inline del `GET /orders/:id` para cargar
  una orden a editar no incluía `variantId/variantName/flavors` (bug preexistente, no
  relacionado a combos) ni `comboChildren` — se agregaron los 4 campos.
- **Ticket y comanda interna** (`PaymentModal.tsx` → `buildOrderReceipt`): el desglose de
  `comboChildren` se agrega como líneas extra en `modifiers` (mismo campo que ya usan
  sabores/modificadores) — como `printComandaCopy`/`buildComandaAscii` reusan el mismo
  `ReceiptData`, la copia de cocina también sale con el desglose sin cambios adicionales.

## Pendiente — bloqueado hasta que Bernardo entregue Fase A

No es que falte código "por flojera"; es que no hay forma honesta de escribirlo sin
inventar el contrato real:

1. **`GET /api/v1/products` real con `comboSlots`.** Hoy `ProductWithModifiers.comboSlots`
   existe en el tipo pero nunca lo puebla nadie — no hay backend que lo mande. Nada que
   hacer en POS hasta entonces; el wiring ya está listo (ver arriba).
2. **`POST /api/v1/orders` con validación real de `combo.children`.** El payload ya se
   arma correctamente (ver arriba) pero nunca se ha probado contra un backend que lo
   entienda. Falta manejar los errores `SLOT_OPTION_INVALID` / `SLOT_QUANTITY_MISMATCH`
   / `VARIANT_REQUIRED` / `FLAVORS_REQUIRED` / `FLAVORS_EXCEED_MAX` / `FLAVOR_SOLD_OUT`
   en la UI (mensaje + mantener el `ComboSheet` abierto para corregir) — no se puede
   testear/afinar el mensaje sin el backend devolviéndolos de verdad.
3. **Cocina** (`app/(kitchen)/index.tsx`, `store/kitchenStore.ts`): mostrar el desglose
   del combo requiere saber cómo el backend serializa `children[]` en
   `GET /kitchen/orders` — no se adivinó esa forma para no dejar código muerto/incorrecto.
   Implementar en cuanto exista el endpoint real (doc 03 §5 + handoff de cocina).
4. **`PUT /orders/:id` en el servidor aceptando `combo.children` actualizado** y
   reexpandiendo hijos — el POS ya manda el campo (ver `saveEdit` arriba); falta que el
   backend lo lea.
5. **Prueba end-to-end real**: vender un "3×2" con 3 sabores distintos y verificar
   `combo.children` + total contra un backend real corriendo Fase A. No ejecutable hoy
   (no hay combo con slots en ningún ambiente).

## Nota — `mobile-android/`

Todo lo de esta sesión se hizo solo en `Copo/mobile` (el ámbito que declara este paquete
de docs). Existe una carpeta paralela `Copo/mobile-android/` con su propio `kitchenStore.ts`
y presumiblemente su propio `posStore`/`cartStore`/`ModifierSheet` (divergencia detectada
en sesiones previas, ver memoria `S781`/`6068`). No se tocó — si `mobile-android` es un
cliente activo (no un fork abandonado), necesita el mismo trabajo replicado a mano o
unificar los dos árboles primero. Confirmar con Roberto antes de duplicar el esfuerzo.

## Verificación hecha

- `npx tsc --noEmit -p tsconfig.json` en `Copo/mobile`: **0 errores** con todos los
  cambios de esta sesión.
- No se corrió la app (Expo) ni se probó en dispositivo/Electron: no hay datos de combo
  con slots en ningún backend disponible para ejercitar `ComboSheet` de extremo a extremo.
  Recomendación: en cuanto Bernardo tenga Fase A en un ambiente de prueba, sembrar un
  combo con 1 slot `CATEGORY quantity=3` y probar el flujo completo desde el POS.
