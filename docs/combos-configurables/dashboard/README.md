# Paquete DASHBOARD — combos configurables (qué implementar en la app del dueño)

> Ámbito: `src/apps/dashboard/pages/CreateComboModal.tsx` (reescritura), `ProductsPage.tsx`
> (entrada al modal + detalle de combo), stores compartidos (`categoryStore`, y lectura de
> productos). Detalle técnico completo en `04-FRONTEND-DASHBOARD.md`. Contexto de producto
> en `../01-SPEC-FUNCIONAL.md`. Se puede implementar en sesión independiente del POS, pero
> DESPUÉS de que el backend (doc 03) exponga los contratos de combo con slots.

## Checklist por fase

### Fase B0 — Preparación (sin backend nuevo)
- [ ] Confirmar tipos compartidos `ComboSlot`, `ComboSlotOption`, `ComboSlotSource` en `@shared-types` (los define doc 02; reflejarlos en `src/types.ts`).
- [ ] Leer `pricingMode` de cada categoría desde `categoryStore` (ya disponible) para saber qué configura cada producto elegible.

### Fase B1 — Editor de combo por slots (requiere backend Fase A)
- [ ] **Reescribir `CreateComboModal.tsx`**: de "lista de productos" a "lista de slots".
- [ ] Quitar la exclusión de VARIANTS (`CreateComboModal.tsx:44-49`): ahora los productos VARIANTS y PRESENTATION SÍ son elegibles.
- [ ] Por slot: nombre, cantidad de unidades, origen (`Categoría` | `Productos específicos`).
  - [ ] Origen `Categoría`: selector de categoría (muestra su `pricingMode` para que el dueño entienda qué elegirá el cajero).
  - [ ] Origen `Productos específicos`: buscador/selector múltiple de productos + delta opcional por opción.
- [ ] Precio del combo (flat) con guardrail anti-$0 (RN-C10) y sugerencia (suma de componentes, como hoy).
- [ ] Validación de guardado: ≥ 1 slot, Σ unidades ≥ 2, categoría o ≥1 opción según origen.
- [ ] **Preview del cajero**: render de los pasos/pickers que verá el POS, para validar antes de guardar.
- [ ] Payload a `POST/PUT /api/v1/products/combo` con `slots[]` (doc 03 §1).

### Fase B2 — Edición y detalle (requiere backend Fase A)
- [ ] Cargar un combo existente (`GET /products/:id` con `comboSlots`) en el editor.
- [ ] Mostrar combos migrados (slots fijos de 1 opción) de forma legible y editable.
- [ ] En `ProductsPage`, el detalle del combo lista sus slots (solo lectura rápida).

### Fase D (dashboard) — Reportes (requiere backend Fase D)
- [ ] Detalle de orden en admin: mostrar el desglose de hijos del combo (solo lectura).
- [ ] Si el backend expone `topFlavors` con sabores de combos, ningún cambio extra (ya se pinta); si expone mix de presentaciones en combo, panel opcional.

## Contratos que consume (resumen; detalle en `../03-BACKEND-API.md`)
- `POST /api/v1/products/combo` y `PUT /api/v1/products/combo/:id` — `{ name, basePrice, slots[] }`.
- `GET /api/v1/products/:id` — combo con `comboSlots[].options[]`.
- `GET /api/v1/categories` — `pricingMode` por categoría (ya se consume).

## Criterios de aceptación
- El dueño arma el "3×2" (1 slot categoría, quantity 3) y el "helado + galleta" (2 slots) sin tocar modifier groups.
- Los productos VARIANTS aparecen como elegibles.
- El preview muestra correctamente lo que el cajero tendrá que elegir.
- Un combo viejo se abre en el editor ya convertido a slots y se puede editar sin romper su venta.
