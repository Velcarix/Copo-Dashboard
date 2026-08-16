# Combos configurables (combos v2) — Paquete de specs

> Rediseño de los combos para que el cajero elija **presentación y sabor por cada unidad**
> del combo al momento de vender (helado 3×2 con 3 presentaciones y 3 sabores distintos,
> combo "helado + galleta" donde se elige cada uno), sin volver a doblar el sistema de
> modificadores y sin romper las métricas que arregló `modos-de-cobro`.
>
> Creado: 2026-08-16 · Autor: Roberto + Claude · Estado: borrador para revisión con Bernardo
> Sucesor directo de `../modos-de-cobro/` (ver "combos v2" en `../modos-de-cobro/dashboard/04-FRONTEND-DASHBOARD.md` §5 y el TODO de POS F2).

## El problema (resumen)

El combo actual es un `Product` con `category = COMBO` y `basePrice` fijo que referencia
productos hijo **fijos** vía `ComboComponent (comboId, componentId, quantity)` con
restricción `@@unique([comboId, componentId])`. Consecuencias verificadas en el código:

1. **No se elige el sabor por unidad.** `quantity` colapsa las unidades idénticas y el
   `@@unique` impide repetir el mismo `componentId`: 3 conos de chocolate son una fila
   `quantity: 3`, imposible darles 3 sabores distintos.
2. **No se elige la presentación por unidad.** Las presentaciones son `Product` separados
   (decisión de `modos-de-cobro`); el combo fija el `componentId` en configuración (dueño),
   no en venta (cajero). El cajero no puede decir "este en vaso, este en cono".
3. **Los productos VARIANTS ni siquiera entran al combo.** `CreateComboModal.tsx:44-49`
   los excluye a propósito con la nota *"hasta que exista selección de variante por
   componente (combos v2, doc 04 §5)"*. Ese "v2" es este paquete.
4. **El único camino de configuración por hijo hoy es revivir modifier groups** (`Sabor`,
   `Tamaño`) en el producto hijo — justo el patrón que `modos-de-cobro` eliminó porque
   rompía `topProducts`/permitía ventas en $0. `ModifierSheet.buildSections` (mobile,
   líneas 31-43) solo arma secciones desde `component.modifierGroups`; nunca invoca el
   selector de presentación ni el `FlavorPicker` para los hijos del combo.
5. **Estructuralmente no hay dónde guardar la selección por unidad.** `OrderItem` tiene UN
   `variantId` y UN arreglo `flavors`; no existe relación padre/hijo entre `OrderItem`s.

Nota de honestidad: `RN-07` de `../modos-de-cobro/01-SPEC-FUNCIONAL.md` ("el sabor se
elige al vender el combo, no al configurarlo") ya declaraba la intención correcta, pero
**nunca se implementó**. Este paquete la construye de verdad.

## La solución (resumen)

El combo deja de ser una lista de productos fijos y pasa a ser una lista de **ranuras
(slots)**. Cada slot describe qué debe elegir el cajero:

| Concepto | Qué es |
|---|---|
| `ComboSlot` | Una "ranura" del combo: nombre ("Elige tu helado"), cuántas unidades (`quantity`), y de dónde salen las opciones. |
| Origen `CATEGORY` | El cajero elige cualquier producto activo de una categoría (ideal para heladería: la categoría PRESENTATION ya tiene cono/vaso/litro como productos). |
| Origen `SPECIFIC_PRODUCTS` | El dueño curó una lista concreta de productos elegibles (`ComboSlotOption`), con delta de precio opcional por opción. |
| Selección por unidad | Cada unidad de un slot produce una elección independiente: producto (= presentación) → sabores (si es PRESENTATION) o variante (si es VARIANTS). |

En la venta, el cajero llena cada slot **reutilizando los mismos componentes que ya
existen** para productos sueltos (`FlavorPicker`, selector de variante). En datos, el combo
se **explota** en `OrderItem` hijos (uno por unidad configurada), cada uno con su
`variantId`/`flavors` en snapshot. El dinero vive en el `OrderItem` raíz (el combo); los
hijos valen $0 y sirven para cocina, inventario y conteo por unidades.

**Decisión clave de diseño (no revertir sin discutir):** la selección por unidad se guarda
como filas de `OrderItem` (padre/hijo), NO como JSON. Así `topProducts`, `topFlavors`,
recetas de inventario, cocina y CFDI siguen funcionando sobre los mismos joins — misma
filosofía que "las presentaciones son filas de `Product`" en `modos-de-cobro`.

## Alineación con `modos-de-cobro` (no se rompe nada de eso)

- **RN-01 intacta:** el dinero se atribuye a producto(+variante); los sabores se cuentan en
  unidades, nunca en pesos (salvo su `+$` premium). En el combo, el ingreso lo lleva el
  producto COMBO; los sabores/presentaciones vendidos dentro del combo se cuentan en
  `topFlavors` y conteos de unidad, sin duplicar ingreso.
- **Guardrail anti-$0 intacto:** los hijos de combo (`parentItemId != null`) están exentos
  del rechazo de $0; su precio es 0 por diseño y el ingreso está en el raíz.
- **Snapshots:** los hijos guardan `variantName`/`flavorName`/`priceDelta` igual que hoy.

## Repos afectados

| Repo | Ubicación | Qué cambia |
|---|---|---|
| Frontend POS + Dashboard | `Copo-Dashboard` (este repo) | Paquetes `dashboard/` (editor de combos v2) y `pos/` (ComboSheet) |
| Backend + Prisma | Monorepo Copo (Bernardo, `api.copopos.com`) | Docs 02 y 03: tablas `ComboSlot`/`ComboSlotOption`, `OrderItem` padre/hijo, validación y explosión en la venta |

> ⚠️ Mismo cuidado que `modos-de-cobro`: el backend real desplegado es la fuente de verdad.
> Bernardo valida el schema vivo antes de migrar. La BD de producción ya trae `pricingMode`,
> `ProductVariant`, `CategoryFlavor`, `OrderItemFlavor` (migración de julio 2026).

## Documentos y orden de lectura

**Comunes (leer primero):**

1. `01-SPEC-FUNCIONAL.md` — qué se construye y por qué. Reglas de negocio y criterios de aceptación.
2. `02-DATA-MODEL-BD.md` — cambios Prisma, migración y backfill de combos existentes.
3. `03-BACKEND-API.md` — endpoints de combo con slots, validación de venta, explosión en `OrderItem`, inventario y reportes.

**Paquetes por app (independientes entre sí):**

- `dashboard/` — README-checklist + `04-FRONTEND-DASHBOARD.md` (editor de slots, reemplaza `CreateComboModal`).
- `pos/` — README-checklist + `05-FRONTEND-POS.md` (`ComboSheet`, carrito con desglose, offline, cocina/ticket). Estado real de implementación en `pos/PLAN-EJECUCION.md`.

`PENDIENTES.md` — decisiones abiertas para Roberto y Bernardo.
`HANDOFF-BACKEND-FASE-A.md` — punto de entrada operativo para la sesión que implemente Fase A (backend).

## Fases (orden de implementación)

| Fase | Contenido | Riesgo | Dependencias |
|---|---|---|---|
| **A — Modelo + backend** | `ComboSlot`/`ComboSlotOption`, `OrderItem.parentItemId`, endpoints crear/editar/serializar combo, validación y explosión en la venta, inventario por hijo, **backfill de combos actuales a slots fijos** | Medio-alto | Ninguna (la BD ya tiene pricing modes) |
| **B — Dashboard builder v2** | Reescribir `CreateComboModal` → editor de slots; incluir VARIANTS/PRESENTATION; deltas por opción; preview de la experiencia del cajero | Medio | Fase A |
| **C — POS `ComboSheet`** | Wizard de slots reusando `FlavorPicker`/selector de variante; carrito con desglose; Dexie/sync; cocina y ticket con desglose | Medio-alto | Fase A |
| **D — Reportes** | Combos en `topFlavors`/conteos de unidad; detalle de orden con desglose de combo en admin; combo attach opcional | Bajo | Fases A-C |

Cada fase es desplegable y compatible hacia atrás: los combos existentes migran a un slot
fijo por componente y se venden igual que hoy hasta que el dueño arme un combo configurable.

## Criterio de éxito global

- Un combo "3 helados 3×2" se configura en el dashboard en < 5 min y el cajero vende 3
  helados con 3 presentaciones y 3 sabores distintos en una sola línea de carrito.
- Un combo "helado + galleta" pide elegir cada componente (presentación/sabor del helado,
  cuál galleta) sin usar modifier groups doblados.
- `Σ ingreso de combos` cuadra con lo cobrado; ningún hijo de combo duplica ingreso.
- Cocina ve el desglose real de cada combo; el inventario descuenta los productos realmente
  elegidos, no una lista fija.
- Los combos viejos migrados siguen vendiéndose sin que nadie los reconfigure.
