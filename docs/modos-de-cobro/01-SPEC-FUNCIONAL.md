# 01 — Spec funcional: modos de cobro por categoría

## 1. Concepto

Toda categoría tiene un `pricingMode` que define dónde vive el precio y qué flujo ve el
cajero. Se elige al crear la categoría con una pregunta simple y se puede cambiar después
(con validaciones, ver §6).

### FIXED — precio único (default, comportamiento actual)
- El producto tiene `basePrice` > 0.
- Grupos de opciones = **Extras** reales (`+$` opcional) o elecciones sin precio (salsas).
- Ejemplo: Galleta chocochips $35; Banderilla mozzarella $75 + empanizado hot cheetos +$10.

### VARIANTS — variantes por producto
- La categoría define un **esquema** de nombres de variantes una sola vez (ej. Chico / Mediano / Grande).
- Cada producto pone **su** precio absoluto por variante (Latte: 45/55/65 · Americano: 35/45/50).
- El cajero elige exactamente una variante (obligatorio). Los extras siguen igual.
- El precio de la variante es ABSOLUTO, no delta. `basePrice` del producto deja de usarse
  para cobrar (la lista muestra "desde $X" = variante más barata).

### PRESENTATION — el producto es la presentación
- Los productos de la categoría son las presentaciones: Cono sencillo $50, Vaso $60, Litro $300.
- Cada presentación declara `maxFlavors` (sabores incluidos: 1, 2, 4…).
- La categoría tiene un **catálogo de sabores** (no son productos): nombre, activo,
  agotado hoy, `+$` opcional para sabores premium, vínculo a inventario (fase posterior).
- El cajero: toca la presentación → elige de 1 a `maxFlavors` sabores (con repetición:
  "doble mango" = mango ×2) → agrega. Los extras siguen igual.

## 2. Reglas de negocio

- **RN-01** El dinero SIEMPRE se atribuye a `producto (+ variante)`. Los sabores se miden
  en unidades, nunca en pesos (salvo su `+$` premium, que suma al total de línea).
- **RN-02** `totalPrice` de línea = `(unitPrice + Σ extras + Σ deltas de sabor) × cantidad`,
  calculado y validado en el backend. El frontend solo lo muestra.
- **RN-03** No se puede agregar al carrito un ítem en $0 si su categoría es VARIANTS o
  PRESENTATION, ni si tiene grupos requeridos sin resolver. En FIXED, `basePrice = 0`
  dispara advertencia al guardar el producto en el dashboard.
- **RN-04** Un sabor `soldOut` no puede venderse (POS lo muestra deshabilitado; backend
  rechaza con `FLAVOR_SOLD_OUT` para cubrir carreras y órdenes offline encoladas).
- **RN-05** Cambiar el esquema de variantes de una categoría propaga nombres a los
  productos existentes; los precios por producto no se tocan.
- **RN-06** `pricingMode` default `FIXED`: todo catálogo existente sigue funcionando
  sin migración obligatoria.
- **RN-07** Combos: `ComboComponent.componentId` apunta a productos, incluidas
  presentaciones. El sabor se elige al vender el combo, no al configurarlo.
- **RN-08** Los sabores premium (`priceDelta > 0`) son la excepción, no la regla; la UI
  los muestra como "+$" junto al nombre del sabor.

## 3. Flujos de configuración (dueño, dashboard)

### Crear/editar categoría
1. Nombre, emoji, color (como hoy).
2. Pregunta: **"¿Cómo se cobra esta categoría?"** — 3 tarjetas con ejemplo concreto:
   - "Cada producto tiene su precio" (FIXED)
   - "Cada producto tiene precios por tamaño" (VARIANTS) → pide el esquema (chips: Chico, Mediano…)
   - "El precio depende de la presentación, no del sabor" (PRESENTATION) → habilita pestaña Sabores
3. En PRESENTATION: gestión del catálogo de sabores (alta 1 clic, toggle agotado, orden, +$ premium).

### Crear/editar producto (según modo de su categoría)
- FIXED: como hoy. Pestaña "Configuraciones" se renombra **"Extras"**.
- VARIANTS: tabla de precios (filas = esquema de la categoría, editable solo el precio).
- PRESENTATION: precio de la presentación + campo "Sabores incluidos" (número). Sin grupos de precio.

## 4. Flujo de venta (cajero, POS)

- FIXED sin extras requeridos: 1 tap agrega al carrito (hoy ya es así).
- VARIANTS: tap → sheet de variantes (radio, obligatorio, precio absoluto visible) → extras → agregar.
- PRESENTATION: tap a la presentación → FlavorPicker (chips con contador, máx `maxFlavors`,
  agotados deshabilitados, mínimo 1) → extras → agregar.
- El botón Agregar muestra el total de línea y está deshabilitado hasta cumplir requisitos
  (patrón `canConfirm` ya existente en `ModifierSheet.tsx`).
- Regla de casa: una venta en ≤ 5 taps se mantiene en los tres modos.

## 5. Métricas por modo (dashboard del dueño)

| Panel | Cuándo aparece | Fuente |
|---|---|---|
| Núcleo (ventas, ticket, órdenes, por método, por empleado/turno, gráfica) | Siempre | Ya existe |
| Top productos por ingreso | Siempre (con Fase 0 deja de dar $0) | `topProducts` |
| Mix por variante | Si hay ventas con `variantId` | `byVariant` |
| Top sabores (unidades) | Si hay ventas con sabores | `topFlavors` |
| Extras: attach rate y top | Si hay extras con precio vendidos | `extras` |

Nota: NO existe panel "byPresentation" separado — en PRESENTATION las presentaciones SON
productos, así que `topProducts` ya es "ingreso por presentación". El frontend solo adapta
el rótulo si lo desea (baja prioridad).

## 6. Cambios de modo y casos borde

- FIXED → VARIANTS/PRESENTATION: permitido; los productos requieren completar datos
  (variantes o `maxFlavors`) antes de estar visibles en el POS.
- VARIANTS/PRESENTATION → FIXED: permitido solo si cada producto tiene `basePrice` > 0;
  las variantes/sabores quedan inactivos (no se borran: hay órdenes históricas que los referencian).
- Producto cambiado de categoría: hereda el modo de la nueva categoría; misma validación.
- Órdenes históricas: intactas. Los snapshots (`variantName`, `flavorName`, `optionName`)
  garantizan que los reportes viejos no dependan de catálogo vivo.

## 7. Migración del cliente piloto (heladería)

Heurística asistida (script + confirmación manual, ver `02-DATA-MODEL-BD.md` §5):
1. Detectar categorías donde ≥80% de productos tienen `basePrice = 0` y grupos
   single-select con precios → proponer PRESENTATION.
2. La unión de opciones de esos grupos (nombre + precio) → productos presentación.
   Ej.: "cono/Sencillo +$60" → producto "Cono sencillo" $60.
3. Los productos actuales (Vainilla, Mango…) → filas de `CategoryFlavor`.
4. El producto-workaround "Presentación" (16 grupos) se desactiva tras validar con el cliente.
5. Órdenes históricas no se re-mapean; solo se corrige `totalPrice` (Fase 0).

## 8. Criterios de aceptación (resumen por fase)

- **F0**: `Σ topProducts == totalSales` en día sin descuentos/propinas; imposible guardar
  producto vendible en $0 sin advertencia explícita.
- **F1**: cafetería demo configura 5 bebidas × 3 tamaños en < 10 min; POS exige variante;
  `byVariant` reporta mix real.
- **F2**: heladería piloto migrada opera 1 semana sin soporte; alta de sabor = 1 acción;
  venta de litro con 4 sabores en ≤ 5 taps; `topFlavors` refleja unidades.
- **F3**: dashboard nunca muestra un panel vacío; combo "Litro + 4 galletas $350" se
  configura y cobra correctamente.

## 9. Riesgos y mitigaciones

- **Onboarding confuso al elegir modo** → tarjetas con ejemplos del giro + plantillas
  precargadas por vertical ("Heladería tradicional" trae presentaciones típicas editables).
- **Clientes existentes con el patrón viejo** → no se fuerza migración; banner sugerido
  "esta categoría parece cobrarse por presentación, ¿convertir?" (fase 2, opcional).
- **Doble fuente de verdad de precio en VARIANTS** (`basePrice` vs variantes) → `basePrice`
  se ignora al cobrar; el serializer expone `priceFrom` para las tarjetas.
- **Inventario por sabor con merma real desconocida** → fase posterior, detrás de flag;
  validar factores con datos del piloto antes de fijarlos.
