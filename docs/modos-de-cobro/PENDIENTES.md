# Pendientes — modos de cobro (post-push)

> Estado al 2026-07-07. Prerrequisito asumido: la rama `fix/orderitem-totalprice-modifiers`
> del repo `Velcarix/Copo` ya fue pusheada y el PR hacia `master` está abierto.
> Contiene 2 commits: `d4898731` (Fase 0: fix totalPrice + backfill) y
> `22a1a1d4` (Fases 1-2: schema, endpoints, validación de órdenes, reportes).
> Frontends: dashboard y POS ya están en master de sus repos — se encienden solos
> cuando este backend despliegue.

## 1. Backend — Bernardo (bloqueante de todo lo demás)

- [ ] **Revisar el PR** (11 archivos, +568/−45, más el fix F0). Puntos de atención:
  validación por modo en `order.service.ts`, upsert de variantes con baja lógica en
  `product.service.ts`, `Prisma.DbNull` para limpiar `variantScheme`, y las dos
  desviaciones deliberadas del spec (en el header del doc 03): `PRICE_MISMATCH` no
  rechaza (warn + se respeta el precio cobrado) y `FLAVOR_SOLD_OUT` solo rechaza
  ventas en línea. Ambas por offline-first — si Bernardo discrepa, se discute en el PR.
- [ ] **Generar la migración** (el SQL aún NO existe, solo el schema):
  ```bash
  cd backend
  npm install
  npx prisma migrate dev --name add_pricing_modes
  ```
- [ ] **Correr la suite con BD real**: `npm test`. El typecheck ya pasó limpio, pero
  los tests de integración no se pudieron correr sin base de datos — puede haber
  ajustes finos.
- [ ] **Merge a master + deploy** (Railway aplica la migración solo: el `start` corre
  `prisma migrate deploy`).
- [ ] **Backfill de Fase 0** (corrige métricas históricas en $0):
  ```bash
  npx tsx src/scripts/backfill-orderitem-totalprice.ts          # dry-run, solo reporta
  npx tsx src/scripts/backfill-orderitem-totalprice.ts --apply  # producción, fuera de pico
  ```
  El script verifica al final que queden 0 ítems inconsistentes.

## 2. Validación end-to-end — Roberto (~15 min, después del deploy)

- [ ] Dashboard: cambiar una categoría de prueba a **por presentación**, agregar
  sabores (input + Enter), toggle "agotado hoy". Guardar ya NO debe fallar.
- [ ] Dashboard: crear un producto con **variantes** en otra categoría (esquema
  Chico/Grande) y ver "desde $X" en la lista.
- [ ] POS: vender un litro con sabores; vender un producto con variante; una venta
  en modo avión y verificar que sincroniza al volver la red.
- [ ] Métricas: Top productos y Ventas por categoría dejan de marcar $0;
  `Σ top productos ≈ ventas por forma de pago` (sin descuentos/propinas); aparecen
  los paneles "Mix por variante" y "Top sabores" cuando hay ventas de esos modos.

## 3. Cliente piloto (heladería) — Roberto

- [ ] **Actualizar la app en TODAS las cajas de la sucursal ANTES de cambiar el
  `pricingMode` de sus categorías.** Regla crítica: una caja con app vieja no sabe
  mandar `variantId`/`flavors` y sus ventas en categorías nuevas fallarían.
- [ ] Migrar su menú a modo presentación:
  - Opción A — manual con la UI nueva (~15 min): crear presentaciones (Cono, Vaso,
    Botes) como productos con precio, capturar sabores en la categoría.
  - Opción B — script asistido (ver §4, aún no existe).
- [ ] Desactivar los productos-workaround: los 12 sabores con basePrice $0 y el
  producto "Presentación" (16 grupos). No borrarlos — tienen ventas históricas.
- [ ] Operar acompañado ~1 semana y medir el criterio F2 del spec: alta de sabor en
  1 acción, venta de litro en ≤ 5 taps, cero ventas en $0.

## 4. Código pendiente (deliberado, no accidental)

- [ ] **Script de migración del menú del piloto** (doc `02` §5): convierte grupos
  cono/vaso/botes → productos-presentación y sabores-producto → catálogo, con
  dry-run y confirmación. Sin él, la migración es manual (opción A de §3).
- [ ] **Inventario por sabor** (`inventoryItemId` + factor por presentación):
  pospuesto a propósito — fijar los factores requiere datos reales de merma del
  piloto (doc `01` §9).
- [ ] **Combos v2** (variante fija por componente): fase 3 opcional (doc
  `dashboard/04` §5). Los combos actuales sobre presentaciones ya funcionan.
- [ ] **Export a Excel**: hojas "Variantes" y "Sabores" (doc `dashboard/04` §4, menor).

## 5. Limpieza de repos (no bloqueante, recomendado)

- [ ] Consolidar las copias del monorepo: `Desktop\Copo` apunta al remote viejo
  (`Robertiu/Copo`) y tiene otra copia anidada; la de trabajo real es
  `Nueva carpeta (3)\Copo` → `Velcarix/Copo`. Riesgo actual: editar la copia equivocada.
- [ ] En el clon hay cambios sin commitear que NO son de este trabajo:
  `backend/src/services/kitchen.service.ts` y
  `mobile-android/components/kitchen/KitchenCard.tsx` — confirmar si son WIP de
  alguien o descartarlos.
- [ ] Los docs `docs/modos-de-cobro/` siguen sin commitear en Copo-Dashboard
  (se decidió posponer) — subirlos cuando se quiera versionarlos.
- [ ] La copia local de Copo-Dashboard muestra ~90 archivos "modificados" que son
  solo ruido de line endings (CRLF) — no commitear en bloque sin revisar.

## Criterio de cierre

El piloto opera en modo presentación una semana sin soporte, con métricas que
cuadran (`Σ top productos ≈ ventas por método`) y alta de sabores en un clic.
Ahí se considera cerrado el rediseño y se decide si arrancan inventario por
sabor y combos v2.
