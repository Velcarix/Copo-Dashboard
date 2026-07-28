# Paquete DASHBOARD — qué implementar en la app del dueño

> Ámbito: `src/apps/dashboard/` + stores compartidos (`categoryStore`, nuevo `flavorStore`)
> + `src/shared/lib/exportExcel.ts`. Detalle técnico completo en `04-FRONTEND-DASHBOARD.md`.
> Contexto de producto en `../01-SPEC-FUNCIONAL.md`. Este paquete se puede implementar en
> una sesión independiente del POS.

## Checklist por fase

### Fase 0 — Guardrails (sin dependencia del backend)
- [ ] Aviso al desmarcar "Requerido" en grupos con opciones de precio (`ProductsPage.tsx`, grupos nacen `required: true` en línea 744).
- [ ] Modal de confirmación al guardar producto vendible en $0.
- [ ] (Cuando exista) mostrar `warnings: ["ZERO_PRICE"]` del backend.

### Fase 1 — Categorías con modo de cobro (requiere backend F1)
- [ ] `CategoryMeta` += `pricingMode`, `variantScheme` (`categoryStore.ts`, `fromApi` línea 24).
- [ ] Selector de 3 tarjetas "¿Cómo se cobra esta categoría?" en el modal de categorías (botón "Categorías", `ProductsPage.tsx` línea 1164).
- [ ] Editor de esquema de variantes (chips reordenables, renombrar propaga — RN-05).
- [ ] Editor de producto condicional: FIXED igual que hoy (pestaña renombrada "Extras") · VARIANTS con tabla de precios por variante · PRESENTATION con precio + "Sabores incluidos".
- [ ] Payload de products con `variants[]` y `maxFlavors`; lista con "desde $X" (`priceFrom`).
- [ ] Badge "Incompleto" para productos VARIANTS sin precios.

### Fase 2 — Sabores (requiere backend F2)
- [ ] Pestaña "Sabores" en categorías PRESENTATION: alta con input + Enter, "+$" premium, toggle "Agotado hoy", orden.
- [ ] `flavorStore` nuevo (patrón de `categoryStore`).
- [ ] CTA "Importar de mis productos" (candidatos = productos $0 de la categoría).

### Fase 3 — Dashboard adaptativo (requiere backend F3)
- [ ] `DashboardHome.tsx`: tipo del response += `byVariant`, `topFlavors`, `extras` (líneas 38-40); render condicional solo con datos (patrón `?? []`, líneas 113-115).
- [ ] Paneles: "Mix por variante" ($), "Top sabores" (unidades, NO pesos — RN-01), "Extras" (attach rate + top).
- [ ] `exportExcel.ts`: hojas "Variantes" y "Sabores" solo si hay datos.
- [ ] `CreateComboModal.tsx`: excluir productos VARIANTS sin variante elegida; combos v2 con `variantId` opcional.

## Contratos que consume (resumen; detalle en `../03-BACKEND-API.md`)
- `PUT /api/v1/categories/:id` — `pricingMode`, `variantScheme`.
- `GET/POST/PUT /api/v1/products` — `variants[]`, `maxFlavors`, `priceFrom`.
- `GET/POST/PUT /api/v1/categories/:id/flavors` + `PATCH …/sold-out`.
- `GET /api/v1/reports/dashboard` — claves opcionales nuevas.

## Criterios de aceptación
- [ ] Cambiar categoría a VARIANTS sin esquema → bloqueado con mensaje claro.
- [ ] Alta de sabor < 5 s; toggle agotado en 1 clic.
- [ ] Cliente 100% FIXED: dashboard idéntico a hoy (cero regresión).
- [ ] Sin `any`; montos en centavos formateados con `src/shared/lib/currency.ts`.
