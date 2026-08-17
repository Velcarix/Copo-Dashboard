# 01 — Spec funcional: combos configurables (combos v2)

## 1. Concepto

Un **combo** es un `Product` con `category = COMBO` y un precio de combo (`basePrice`).
En vez de referenciar productos fijos, referencia **slots (ranuras)**. Cada slot le dice
al cajero qué elegir y de qué conjunto. Al vender, el cajero llena cada slot; cada unidad
elegida se configura por separado (presentación + sabor, o variante), reusando exactamente
los flujos de `modos-de-cobro`.

### Anatomía de un slot

- **Nombre** visible al cajero: "Elige tu helado", "Elige tu galleta".
- **Cantidad** (`quantity`): cuántas unidades hay que elegir en ese slot (3 para "3 helados").
- **Origen de opciones**:
  - `CATEGORY` → cualquier producto activo de una categoría (p. ej. la categoría Helados en
    modo PRESENTATION, cuyos productos son cono/vaso/litro).
  - `SPECIFIC_PRODUCTS` → una lista curada de productos elegibles, cada uno con delta de
    precio opcional.
- **Qué configura cada unidad** se deriva del `pricingMode` de la categoría del producto
  elegido (no se declara aparte):
  - Producto PRESENTATION → tras elegir la presentación, el cajero elige de 1 a `maxFlavors`
    sabores del catálogo de esa categoría (`FlavorPicker`).
  - Producto VARIANTS → el cajero elige la variante (talla). Ver RN-C05 sobre el precio.
  - Producto FIXED → basta elegir el producto.

### Ejemplos objetivo

1. **Heladería "3×2"**: un slot `Helados`, `quantity = 3`, origen `CATEGORY = Helados`.
   Venta: 3 elecciones independientes; cada una presentación + sabores. Precio del combo =
   precio de 2 unidades (flat).
2. **"Helado + galleta"**: slot `Helado` (`quantity 1`, categoría Helados) + slot `Galleta`
   (`quantity 1`, categoría Galletas o lista específica). Venta: elige helado
   (presentación/sabor) y galleta (cuál; variante si aplica).
3. **"Litro + 4 galletas $350"**: slot `Litro` (lista específica = producto "Litro",
   `quantity 1`) + slot `Galletas` (`quantity 4`, categoría Galletas). Cubre el criterio
   F3 de `modos-de-cobro` que quedó pendiente.

## 2. Reglas de negocio (namespace RN-C para no chocar con las de modos-de-cobro)

- **RN-C01** El ingreso del combo vive en el `OrderItem` **raíz** (el producto COMBO):
  `totalPrice = (precioCombo + Σ deltas de todos los hijos) × cantidadDelCombo`. Los
  `OrderItem` **hijos** valen `totalPrice = 0` (existen para cocina, inventario y conteo por
  unidades). Nunca se duplica ingreso.
- **RN-C02** Precio **flat por defecto**: elegir cono, vaso o litro dentro de un combo NO
  cambia el precio salvo que el dueño defina un delta explícito en la opción del slot
  (`ComboSlotOption.priceDelta`). Esto hace el "3×2" predecible.
- **RN-C03** Los **sabores premium** (`CategoryFlavor.priceDelta > 0`) SÍ suman al total del
  combo (coherencia con RN-08 de modos-de-cobro). El delta se atribuye al raíz (RN-C01) y se
  guarda como snapshot en el hijo para trazabilidad.
- **RN-C04** Un slot está **resuelto** cuando sus `quantity` unidades están completas: cada
  unidad tiene producto elegido y, si aplica, sabores dentro de `[1, maxFlavors]` o variante
  seleccionada. El combo se puede cobrar solo si todos sus slots están resueltos.
- **RN-C05** En un combo, la **variante elegida se registra pero su precio absoluto NO se
  cobra**: el combo es flat (RN-C02). La variante se guarda como snapshot (para cocina e
  inventario). Esto resuelve por qué hoy los productos VARIANTS están excluidos del combo.
  Si el dueño quiere que "grande" cueste más dentro del combo, lo modela con
  `ComboSlotOption.priceDelta`, no con el precio de la variante.
- **RN-C06** Un sabor `soldOut` no puede venderse dentro del combo (POS lo deshabilita;
  backend rechaza `FLAVOR_SOLD_OUT`, con la misma excepción para replays offline que ya
  aplica en modos-de-cobro).
- **RN-C07** Repetición permitida dentro de un slot: en el "3×2" las 3 unidades pueden ser
  el mismo producto y el mismo sabor, o todas distintas. No hay `@@unique` que lo impida
  (el modelo viejo `ComboComponent` sí lo impedía).
- **RN-C08** Compatibilidad: los combos existentes migran a **un slot fijo
  (`SPECIFIC_PRODUCTS`, `quantity` del componente, una sola opción = el producto)** por cada
  `ComboComponent`. Se venden igual que hoy (elección trivial de 1 opción) hasta que el
  dueño los edite.
- **RN-C09** Un combo debe tener ≥ 1 slot y el total de unidades (`Σ slot.quantity`) ≥ 2,
  para conservar la semántica de "combo" (el schema viejo exigía ≥ 2 componentes).
- **RN-C10** El precio del combo (`basePrice`) es obligatorio y > 0 (guardrail anti-$0).

## 3. Flujo de configuración (dueño, dashboard)

### Crear/editar combo (reemplaza `CreateComboModal`)
1. Nombre del combo, imagen opcional, **precio del combo** (flat).
2. **Slots**: agregar uno o varios. Por cada slot:
   - Nombre visible ("Elige tu helado").
   - Cantidad de unidades.
   - Origen: **"De una categoría"** (elige categoría) o **"Productos específicos"** (elige
     productos; se permiten FIXED, VARIANTS y PRESENTATION).
   - (Opcional) delta de precio por opción, solo en `SPECIFIC_PRODUCTS`.
3. **Preview** de lo que verá el cajero (lista de pasos/pickers) para validar antes de guardar.
4. Guardar → `POST/PUT /api/v1/products/combo` con `slots[]` (ver doc 03).

Regla de UX: el editor debe dejar claro que el combo es de precio fijo y que cono/vaso/litro
no cambian el precio salvo delta explícito (evita la confusión que Roberto describe hoy).

## 4. Flujo de venta (cajero, POS)

1. El cajero toca la tarjeta del combo → abre `ComboSheet`.
2. `ComboSheet` muestra un paso por unidad de cada slot: "Helado 1 de 3", "Helado 2 de 3"…
3. Por unidad:
   - Elegir producto (grid de la categoría, o lista de opciones específicas).
   - Si PRESENTATION → `FlavorPicker` (1..maxFlavors, agotados deshabilitados, premium "+$").
   - Si VARIANTS → selector de variante (radio). Precio flat (RN-C05).
   - Si FIXED → listo.
4. Total de línea en vivo = precioCombo + Σ deltas. Botón "Agregar" deshabilitado hasta que
   todos los slots estén resueltos (patrón `canConfirm` existente).
5. Al agregar, el carrito muestra **una línea de combo** con desglose expandible de sus
   unidades. Regla de casa: el combo se arma sin salir del sheet; los combos simples
   (1 opción por slot) se agregan casi en 1 tap.

## 5. Reportes (dueño, dashboard)

| Panel | Cuándo aparece | Fuente |
|---|---|---|
| Top productos por ingreso | Siempre | `topProducts` (el combo aparece como producto; ingreso correcto por RN-C01) |
| Top sabores (unidades) | Si hay ventas con sabores, **incluye los vendidos dentro de combos** | `topFlavors` sobre `OrderItemFlavor` de hijos |
| Presentaciones/variantes vendidas en combo | Si hay combos con slots de categoría | conteo de `OrderItem` hijos por `productId`/`variantId` (unidades, no $) |
| Detalle de orden (admin) | Siempre | La orden muestra el combo y su desglose de hijos (solo lectura) |

No se crea un panel de "ingreso por presentación dentro de combo": el ingreso es del combo
(RN-C01); lo que se mide dentro es en unidades.

## 6. Casos borde

- **Producto elegible dado de baja** entre configuración y venta: el POS lo oculta; si el
  slot es `SPECIFIC_PRODUCTS` y se queda sin opciones activas, el combo se marca
  "no disponible" en el POS. Órdenes históricas intactas (snapshots).
- **Cambiar el precio de una variante/sabor** tras vender offline: se respeta lo cobrado y
  se registra `PRICE_MISMATCH` como warning (misma política que modos-de-cobro), porque el
  combo es flat de todos modos.
- **Editar un combo ya vendido**: los slots nuevos no reescriben órdenes pasadas; los hijos
  históricos conservan sus snapshots.
- **Combo dentro de combo**: no soportado (un slot no puede ofrecer productos COMBO). Se
  valida en backend.
- **Sabores incluidos vs. premium**: los incluidos no suman; los premium suman al raíz. Si
  un combo permite 2 sabores y el cajero elige 1 premium + 1 incluido, suma solo el premium.

## 7. Criterios de aceptación por fase

- **A (backend):** crear un combo con slots vía API; una venta con 3 unidades distintas
  genera 1 `OrderItem` raíz + 3 hijos con sus `flavors`/`variantId`; `Σ totalPrice` de la
  orden cuadra; inventario descuenta los productos realmente elegidos; backfill convierte
  todos los combos viejos a slots fijos sin cambiar su comportamiento.
- **B (dashboard):** el dueño arma el "3×2" y el "helado + galleta" sin tocar modifier
  groups; el editor muestra preview; los productos VARIANTS ya son seleccionables.
- **C (POS):** venta del "3×2" con 3 presentaciones/sabores distintos en ≤ ~8 taps totales,
  una sola línea de carrito con desglose; funciona offline y sincroniza; cocina imprime el
  desglose.
- **D (reportes):** `topFlavors` incluye sabores vendidos en combos; el detalle de orden en
  admin muestra el desglose; ningún ingreso duplicado.

## 8. Riesgos y mitigaciones

- **Complejidad de UI en el POS** (varias unidades a configurar) → wizard con progreso
  claro ("2 de 3"), defaults inteligentes (recordar la última presentación elegida en el
  slot), y permitir "repetir anterior" para llenar rápido las 3 unidades iguales.
- **Doble conteo de ingreso** si alguien pone precio en los hijos → invariante dura:
  hijos con `parentItemId != null` tienen `totalPrice = 0`; validado en backend y en un test.
- **Migración de combos viejos** → backfill idempotente con dry-run (doc 02 §4); mantener
  `ComboComponent` como respaldo hasta confirmar.
- **POS viejo tras habilitar combos v2** → un combo con slots no-triviales no debe
  serializarse a un POS que no lo entiende; regla operativa: actualizar cajas antes de armar
  combos configurables (igual que modos-de-cobro).
