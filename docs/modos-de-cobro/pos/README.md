# Paquete POS — qué implementar en la app del cajero

> Ámbito: `src/apps/pos/` + `posStore` / `cartStore` + offline (`src/shared/lib/db.ts`,
> `sync.ts`). Detalle técnico completo en `05-FRONTEND-POS.md`. Contexto de producto en
> `../01-SPEC-FUNCIONAL.md`. Este paquete se puede implementar en una sesión independiente
> del dashboard, pero DESPUÉS de que el backend exponga los campos de cada fase.

## Checklist por fase

### Fase 0 — Nada
La validación de requeridos ya existe (`ModifierSheet.tsx`: `isConfirmEnabled` líneas
56-58, `canConfirm` línea 116, botón 197). El "Agregar · $0.00" del piloto se arregla
con datos + guardrails del dashboard, no con código POS.

### Fase 1 — Selector de variante (requiere backend F1)
- [ ] `ProductWithModifiers` (`posStore.ts`) += `pricingMode`, `variants[]`, `maxFlavors`, `priceFrom`.
- [ ] `ProductCard.tsx`: "desde $X" en VARIANTS; precio absoluto en PRESENTATION.
- [ ] `ModifierSheet.tsx`: sección fija "Variante" (radio obligatorio, precio absoluto como precio del ítem, no "+$").
- [ ] `CartItem` (`src/types.ts` línea 328) += `variantId?`, `variantName?`; `unitPrice` = precio de variante.
- [ ] `CartItemRow.tsx`: "Latte · Grande".
- [ ] Payload de orden con `variantId`.

### Fase 2 — FlavorPicker + offline (requiere backend F2)
- [ ] Nuevo `FlavorPicker.tsx` (chips con contador, "2 de 2", repetición permitida, agotados deshabilitados, premium "+$").
- [ ] `CartItem` += `flavors[]`; `CartItemRow`: "Litro · mango ×2, pistache ×2".
- [ ] Total de línea = `(unitPrice + Σ extras + Σ flavors.priceDelta×qty) × cantidad` — debe cuadrar con el backend o responde `PRICE_MISMATCH`.
- [ ] **Dexie bump** (`db.ts`): products con `variants`/`maxFlavors`/`pricingMode` embebidos + store `flavors`; migración de versión IndexedDB sin romper cachés viejos.
- [ ] Bootstrap: cachear `GET /categories` y `GET /categories/:id/flavors`.
- [ ] Cola de sync (`sync.ts`): serializar campos nuevos; órdenes viejas en cola siguen sincronizando.
- [ ] Nice-to-have: toggle "agotado" desde POS (local inmediato + PATCH encolado, last-write-wins).
- [ ] Combos con componentes presentación: FlavorPicker secuencial por componente.

### Fase 3 — Nada obligatorio
Combos v2 (variante fija por componente) es opcional, ver `../dashboard/04-FRONTEND-DASHBOARD.md` §5.

## Contratos que consume (resumen; detalle en `../03-BACKEND-API.md`)
- `GET /api/v1/products` — `variants[]`, `maxFlavors`, `priceFrom` (+ `pricingMode` vía categorías).
- `GET /api/v1/categories` y `GET /api/v1/categories/:id/flavors` (cacheados en Dexie).
- `POST /api/v1/orders` / bulk sync — `variantId`, `flavors[]`. Errores a manejar:
  `VARIANT_REQUIRED`, `FLAVORS_REQUIRED`, `FLAVORS_EXCEED_MAX`, `FLAVOR_SOLD_OUT` (solo
  en línea; encoladas se aceptan), `PRICE_MISMATCH`.
- `PATCH /api/v1/categories/:id/flavors/:fid/sold-out`.

## Regla de despliegue (crítica)
No cambiar el `pricingMode` de una categoría hasta que las cajas de esa sucursal tengan
la app con la fase correspondiente — las cajas offline con app vieja no saben mandar
`variantId`/`flavors`.

## Criterios de aceptación
- [ ] Modo avión: venta de litro con 4 sabores + extra premium; al volver la red sincroniza sin `PRICE_MISMATCH`.
- [ ] VARIANTS: imposible agregar sin variante.
- [ ] Cliente 100% FIXED: cero cambios de flujo ni de taps.
- [ ] Editar orden desde historial restaura variante y sabores intactos.
- [ ] Venta en ≤ 5 taps se mantiene en los tres modos.
