# 04 — Frontend: Dashboard del dueño

> Repo: este (`Copo-Dashboard`). Archivos clave citados con líneas del 2026-07-03.

## 1. FASE 0 — Guardrails en el editor actual (sin rediseño)

**Archivo:** `src/apps/dashboard/pages/ProductsPage.tsx` (1414 líneas).

- Los grupos nuevos ya nacen con `required: true` (línea 744) — conservar. Agregar:
  al **desmarcar** "Requerido" en un grupo cuyas opciones tienen precio, mostrar aviso
  inline: "Sin esto, el cajero puede vender este producto en $0".
- Al guardar producto con `basePrice = 0` y sin ningún grupo requerido con opciones de
  precio: modal de confirmación "Este producto puede venderse en $0. ¿Guardar así?"
  (aprovechar `warnings: ["ZERO_PRICE"]` del backend cuando exista, doc 03 §2; mientras,
  validación local).
- Micro-fix de datos: la lista muestra `$0.00` en toda la categoría del cliente piloto —
  con Fase 0 del backend el dashboard de reportes ya cuadra; esto es solo prevención.

## 2. FASE 1 — Categorías con modo de cobro

**Archivos:** modal/página de categorías (hoy dentro de `ProductsPage.tsx`, botón
"Categorías") y `src/shared/store/categoryStore.ts` (tipos `CategoryMeta`/`ApiCategory`).

- `CategoryMeta` += `pricingMode: 'FIXED' | 'VARIANTS' | 'PRESENTATION'`,
  `variantScheme?: string[]` (mapear en `fromApi`, línea 24).
- UI al crear/editar categoría: selector de 3 tarjetas ("¿Cómo se cobra esta categoría?")
  con ejemplo por giro (copys en `01-SPEC-FUNCIONAL.md` §3). Default FIXED.
- VARIANTS: editor de esquema como chips reordenables (Chico / Mediano / Grande).
  Renombrar chip → confirma propagación (RN-05).

### Editor de producto condicional por modo

- **FIXED**: como hoy; renombrar pestaña "Configuraciones" → **"Extras"**.
- **VARIANTS**: reemplazar el campo "Precio base" por tabla "Precios por variante"
  (filas fijas del esquema; input solo de precio, en pesos con conversión a centavos como
  el input actual). La lista de productos muestra "desde $X" (`priceFrom` del serializer).
- **PRESENTATION**: el formulario es la presentación: nombre ("Litro"), precio, campo
  numérico "Sabores incluidos" (`maxFlavors`). Pestaña Extras disponible; NO hay grupos
  de precio. Encabezado con hint: "Los sabores se administran en la categoría".

### Payloads
`POST/PUT /api/v1/products` (líneas 1113-1116) agrega `variants[]` y `maxFlavors`
según doc 03 §2. Tipos nuevos importados de `@shared-types`, no `any` (regla del repo).

## 3. FASE 2 — Gestión de sabores

Nueva sección en la categoría PRESENTATION (pestaña "Sabores" del modal de categoría):

- Tabla: nombre · "+$" premium (default $0) · toggle **Agotado hoy** · activo · orden (drag).
- Alta = un input + Enter (objetivo: 1 acción por sabor, criterio F2).
- Endpoints doc 03 §3. Estado en un store nuevo `flavorStore` (patrón de `categoryStore`).
- Vacío con CTA: "Agrega tu primer sabor" + botón "Importar de mis productos" que lista
  los productos $0 de la categoría como candidatos (apoyo a la migración §7 del spec).

## 4. FASE 3 — Dashboard adaptativo

**Archivo:** `src/apps/dashboard/pages/DashboardHome.tsx` (465 líneas).

- Tipo del response (líneas 38-40) += `byVariant`, `topFlavors`, `extras` opcionales.
- Render condicional: cada panel nuevo solo si su clave llega con datos (`?? []` ya es el
  patrón, líneas 113-115). Ningún panel vacío, ningún switch manual.
- Paneles nuevos (mismos componentes de barras horizontales que `topProducts`, línea 300):
  - "Mix por variante" — revenue por `variantName`.
  - "Top sabores" — unidades (eje en unidades, NO pesos — RN-01).
  - "Extras" — attach rate como MetricCard secundaria + top extras.
- `src/shared/lib/exportExcel.ts`: hojas nuevas "Variantes" y "Sabores" solo si hay datos.

## 5. Combos

**Archivo:** `src/apps/dashboard/pages/CreateComboModal.tsx` (246 líneas).

- Fases 1-2: sin cambio estructural — `components[].productId` ya apunta a productos, y
  las presentaciones SON productos (RN-07). Ajustes mínimos: mostrar `priceFrom` en
  productos VARIANTS y excluirlos del combo mientras no exista selección de variante.
- Fase 3 (combos v2): componente con `variantId` opcional para fijar variante
  ("Litro" específico) y validación de precio fijo del combo < suma de componentes.
- POS cobra el combo como hoy; si un componente es presentación, el FlavorPicker se abre
  por componente al vender (doc 05 §4).

## 6. Criterios de aceptación del frontend dashboard

- [ ] Cambiar una categoría a VARIANTS sin esquema → bloqueado con mensaje claro.
- [ ] Producto VARIANTS sin precios completos → no visible en POS, badge "Incompleto" en la lista.
- [ ] Alta de sabor en < 5 segundos (input + Enter), toggle agotado en 1 clic.
- [ ] DashboardHome con cliente 100% FIXED se ve idéntico a hoy (cero regresión visual).
- [ ] Sin `any`; tipos desde `@shared-types`; montos siempre centavos → formateo con
      `src/shared/lib/currency.ts`.
