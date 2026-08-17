# Paquete POS — combos configurables (qué implementar en la app del cajero)

> Ámbito: `mobile/` (Expo/React Native + Electron) — `app/(pos)/order.tsx`,
> `components/pos/ModifierSheet.tsx` + nuevo `ComboSheet.tsx`, `components/pos/FlavorPicker.tsx`
> (reuso), `store/posStore.ts`, `store/cartStore.ts`, offline (Dexie/`db.ts`, `sync.ts`),
> tickets y cocina. Detalle técnico en `05-FRONTEND-POS.md`. Contexto en `../01-SPEC-FUNCIONAL.md`.
> Implementar DESPUÉS de que el backend (doc 03) exponga combo con slots y acepte
> `combo.children` en la orden.

> Nota: el TODO viejo de `../modos-de-cobro/pos/README.md` ("Combos con componentes
> presentación: FlavorPicker secuencial por componente") queda **subsumido** por este
> paquete y se implementa aquí de forma completa (por unidad, no solo por componente).

## Checklist por fase

> Estado detallado y correcciones a este doc (Dexie/`src/types.ts` no existen en el
> código real) en [`PLAN-EJECUCION.md`](./PLAN-EJECUCION.md). Resumen: todo lo marcado
> `[x]` está implementado y compila (`tsc --noEmit` limpio) pero **inerte** — no se
> activa hasta que el backend (Fase A) empiece a mandar `comboSlots`. Nada de esto se
> ha probado de extremo a extremo porque no existe un backend con Fase A para probarlo.

### Fase C0 — Tipos y serialización (requiere backend Fase A)
- [x] `ProductWithModifiers` (`posStore.ts`, hoy trae `comboComponents?`) += `comboSlots?: ComboSlotConfig[]`.
- [x] Tipos compartidos `ComboSlotConfig`, `ComboSlotOptionConfig` en `@/types/shared` (`Copo/shared/types/index.ts`).
- [ ] Bootstrap/refresh de productos cachea `comboSlots` embebidos — nada que hacer: `offlineState`/`offlineQueue` cachean el catálogo como JSON plano, `comboSlots` viaja automáticamente en cuanto el backend lo mande (ver PLAN-EJECUCION.md, no es Dexie).

### Fase C1 — ComboSheet (requiere backend Fase A)
- [x] Nuevo `components/pos/ComboSheet.tsx`: wizard con un paso por unidad de cada slot ("Helado 1 de 3"), con chips de progreso tocables.
- [x] Por unidad: elegir producto (grid de opciones del slot) → reusar `FlavorPicker` (PRESENTATION) o `VariantRadio` extraído de `ModifierSheet` (VARIANTS); FIXED sin paso extra.
- [x] `canConfirm` cuando todos los slots están resueltos (patrón de `ModifierSheet`).
- [x] Total en vivo = `basePrice + Σ deltas` (opción + sabores premium). Precio flat (RN-C05).
- [x] Atajo "Repetir anterior" para llenar rápido unidades iguales del mismo slot. (Pendiente, no bloqueante: recordar la última presentación como default visual del grid — nice-to-have, no implementado.)
- [x] `order.tsx` `handleProductTap`: si `product.category === 'COMBO' && comboSlots?.length` → abre `ComboSheet` en vez de `ModifierSheet`; sin `comboSlots` sigue el camino viejo intacto.

### Fase C2 — Carrito + payload (requiere backend Fase A)
- [x] `CartItem` (`@/types/shared`) += `comboChildren?: CartComboChild[]`.
- [x] `cartStore.addComboItem`: método dedicado para combos (guarda `comboChildren`); la deduplicación por firma incluye el desglose completo (dos combos idénticos se agrupan; distintos = líneas separadas).
- [x] `CartItemRow`: una línea de combo con desglose expandible (tap para ver todo, colapsado por defecto).
- [x] Payload de orden: `{ productId: comboId, quantity, combo: { children: [...] } }` en los 3 lugares que arman `CreateOrderItemDto` (pago junto, pago separado, edición de orden).

### Fase C3 — Offline + edición + cocina/ticket (requiere backend Fase A)
- [x] No hay "Dexie bump": el offline real es SQLite/localStorage con catálogo cacheado como JSON plano — `comboSlots` no requiere migración (ver PLAN-EJECUCION.md).
- [x] Cola de sync (`lib/offlineQueue.ts`): serializa el `CreateOrderDto` completo como JSON, `combo.children` viaja sin cambios adicionales; órdenes viejas en cola siguen sincronizando igual.
- [x] Edición de combo desde el historial del POS: `loadOrderForEdit` preserva `comboChildren`; falta que el backend devuelva `comboChildren` en `GET /orders/:id` para que aplique en la práctica.
- [x] Ticket impreso y comanda interna: el desglose de `comboChildren` se agrega a `ReceiptItem.modifiers` (mismo mecanismo que sabores/modificadores) en `buildOrderReceipt`.
- [ ] Pantalla de cocina (`app/(kitchen)/index.tsx`): **no implementado** — depende de la forma real en que el backend serialice `children[]` en `GET /kitchen/orders`; no existe ese contrato todavía (ver doc 03 §5, pendiente en el handoff de backend).

## Contratos que consume (resumen; detalle en `../03-BACKEND-API.md`)
- `GET /api/v1/products` — combos con `comboSlots[].options[]` (+ `pricingMode`/`maxFlavors` por opción).
- `GET /api/v1/categories/:id/flavors` — catálogo de sabores (ya cacheado en Dexie por modos-de-cobro).
- `POST /api/v1/orders` / bulk sync — `combo.children`. Errores a manejar: `SLOT_OPTION_INVALID`, `SLOT_QUANTITY_MISMATCH`, `VARIANT_REQUIRED`, `FLAVORS_REQUIRED`, `FLAVORS_EXCEED_MAX`, `FLAVOR_SOLD_OUT`, `PRICE_MISMATCH` (warning).

## Criterios de aceptación
- Vender el "3×2" con 3 presentaciones y 3 sabores distintos → 1 línea de carrito con desglose; ≤ ~8 taps.
- Funciona sin internet y sincroniza sin perder el desglose.
- Cocina y ticket muestran el desglose real del combo.
- Un combo migrado (1 opción por slot) se agrega casi en 1 tap (elección trivial autocompletada).
