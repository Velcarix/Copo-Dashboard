# 05 — Frontend: POS del cajero (incluye offline)

> Repo: este (`Copo-Dashboard`), app `src/apps/pos/`. Regla de casa: una venta en ≤ 5 taps.

## 1. FASE 0 — Nada que hacer en POS

La validación de grupos requeridos YA existe: `ModifierSheet.tsx` deshabilita el botón
hasta cumplir `required`/`minSelections` (`isConfirmEnabled` líneas 56-58, `canConfirm`
línea 116, botón línea 197).
El "Agregar · $0.00" del cliente piloto ocurre porque sus grupos no están marcados
`required` — se corrige con datos + guardrails del dashboard (doc 04 §1), no con código POS.

## 2. FASE 1 — Selector de variante

- `ProductWithModifiers` (`src/shared/store/posStore.ts`) += `pricingMode` de su categoría,
  `variants[]`, `maxFlavors`, `priceFrom`.
- `ProductCard.tsx`: en VARIANTS mostrar "desde $X"; en PRESENTATION el precio absoluto.
- `ModifierSheet.tsx`: si el producto es VARIANTS, primera sección fija "Variante"
  (radio obligatorio) mostrando **precio absoluto como precio del ítem** — no "+$".
  Reusar el patrón de `SelectInput` con semántica required; el total del footer parte del
  precio de la variante seleccionada.
- `cartStore.ts` / `CartItem` (`src/types.ts` línea 328) += `variantId?`, `variantName?`.
  `unitPrice` del ítem = precio de la variante.
- `CartItemRow.tsx`: mostrar "Latte · Grande".

## 3. FASE 2 — FlavorPicker (modo presentación)

Nuevo componente `src/apps/pos/components/modifiers/FlavorPicker.tsx`, integrado como
primera sección del `ModifierSheet` cuando la categoría es PRESENTATION:

- Chips de sabores con contador por chip (tap = +1, tap en contador = −1; permite "doble mango").
- Header con progreso: "Elige los sabores · 2 de 2". Botón agregar deshabilitado hasta
  `1 <= Σ cantidades <= maxFlavors` (extiende `canConfirm`).
- Agotados (`soldOut`) visibles pero deshabilitados, con etiqueta "agotado".
- Sabores premium muestran "+$" y suman al total del footer en vivo.
- `CartItem` += `flavors?: { flavorId, flavorName, quantity, priceDelta }[]`;
  `CartItemRow` muestra "Litro · mango ×2, pistache ×2".
- Payload de orden: campos de doc 03 §4. Total de línea =
  `(unitPrice + Σ extras + Σ flavors.priceDelta×qty) × cantidad` — mismo cálculo que el
  backend valida (RN-02); si difieren, el backend responde `PRICE_MISMATCH`.

Taps de referencia (litro, 4 sabores): tarjeta → 4 taps de sabor → agregar = 6 taps de
dedo pero 1 sola pantalla; cumple el espíritu de la regla. Con 2 sabores: 4 taps totales.

## 4. Combos en el POS

Al vender un combo cuyos componentes son presentaciones: abrir FlavorPicker por cada
componente que lo requiera (secuencial, mismo sheet). Los componentes FIXED no piden nada.
Combos con componentes VARIANTS quedan bloqueados hasta combos v2 (doc 04 §5).

## 5. Offline (crítico — leer antes de codear)

**Archivos:** `src/shared/lib/db.ts` (Dexie/IndexedDB), `src/shared/lib/sync.ts` (cola).

- **Bump de versión de Dexie** con stores nuevos/extendidos: products (con `variants`,
  `maxFlavors`, `pricingMode` embebidos), `flavors` por categoría. Escribir la migración
  de versión de IndexedDB — clientes con caché viejo no deben romperse al actualizar.
- Bootstrap/refresh del POS: cachear `GET /api/v1/categories` (con `pricingMode`) y
  `GET /api/v1/categories/:id/flavors` junto al catálogo de productos.
- Cola de sync: el payload de orden serializa los campos nuevos tal cual; órdenes viejas
  en cola (formato anterior) deben seguir sincronizando (campos opcionales, doc 03 §6).
- Toggle "agotado" desde POS (nice-to-have F2): acción local inmediata + `PATCH …/sold-out`
  encolado si no hay red; conflicto resuelto por last-write-wins (es un boolean operativo).
- Regla de despliegue coordinado: no cambiar el `pricingMode` de una categoría hasta que
  las cajas de esa sucursal tengan la app con fases 1-2 (doc 02 §4).

## 6. Criterios de aceptación del POS

- [ ] Modo avión: venta completa de litro con 4 sabores + extra premium; al volver la red,
      la orden sincroniza y el backend acepta el total sin `PRICE_MISMATCH`.
- [ ] Producto VARIANTS: imposible agregar sin variante; total del footer siempre correcto.
- [ ] Sabor marcado agotado en dashboard desaparece habilitado del POS tras refresh/sync.
- [ ] Cliente 100% FIXED: cero cambios de flujo ni de taps respecto a hoy.
- [ ] Carrito editado (flujo "Editar" del historial) restaura variante y sabores intactos.
