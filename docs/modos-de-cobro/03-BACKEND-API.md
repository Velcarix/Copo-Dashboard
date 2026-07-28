# 03 — Backend: bugfix, endpoints y validaciones

> Repo: backend (monorepo Copo). Convenciones vigentes: montos en centavos (Int),
> fechas ISO 8601, IDs string, errores `{ error: { code, message, details? } }`,
> validación con Zod en `src/schemas/`.
>
> **Estado 2026-07-07: TODO este documento (F0 + F1-F2 + reportes) está implementado**
> en la rama `fix/orderitem-totalprice-modifiers` (commits `d4898731` y `22a1a1d4`).
> Dos desviaciones deliberadas vs lo escrito abajo, por ser offline-first:
> 1. `PRICE_MISMATCH` NO rechaza — se respeta el precio cobrado (snapshot de la venta
>    física) y se registra `logger.warn` para auditoría.
> 2. `FLAVOR_SOLD_OUT` solo rechaza ventas en línea; los replays offline (traen
>    `createdAt`) se aceptan porque la venta ya ocurrió.
>
> Pendiente para Bernardo: revisar PR, `npx prisma migrate dev --name add_pricing_modes`,
> deploy, y backfill de F0 (`--apply`) en staging → producción.

## 1. FASE 0 — Bugfix `totalPrice` (prioridad máxima, independiente del rediseño)

> **Estado 2026-07-07: implementado** en la rama `fix/orderitem-totalprice-modifiers`
> (commit local en el clon de trabajo, pendiente de push/PR/backfill).

**Archivo:** `src/services/order.service.ts`, UNA aparición real (creación, ~línea 118).
Cubre también órdenes offline: `processBulkSync` llama a `createOrder` internamente.
La segunda coincidencia del patrón (~línea 474) es `editOrder` y NO debe tocarse: el
flujo de edición manda precios aplanados sin modificadores (`editOrderItemSchema`).

```ts
// HOY (bug): omite modificadores
totalPrice: item.unitPrice * item.quantity,

// FIX:
const modsTotal = item.modifiers?.reduce((s, m) => s + m.priceDelta, 0) ?? 0
totalPrice: (item.unitPrice + modsTotal) * item.quantity,
```

Efecto: `report.service.ts` no se toca — `topProducts` (líneas 200-213) y
`salesByCategory` (225-235) ya suman `item.totalPrice`; hoy dan $0 para clientes con
precio en modificadores. Correr después el backfill (doc 02 §1).

**Test de regresión:** orden con 1 ítem base $0 + modificador +$60 × 2 →
`OrderItem.totalPrice = 12000`; `topProducts[0].revenue = 12000`;
`Σ topProducts == totalSales` del período (sin descuentos/propinas).

## 2. FASE 1 — Categorías y variantes

### PUT /api/v1/categories/:id (extender)
```jsonc
// request (campos nuevos, opcionales)
{ "pricingMode": "VARIANTS", "variantScheme": ["Chico", "Mediano", "Grande"] }
```
Validaciones: `variantScheme` requerido y no vacío si `pricingMode = VARIANTS`;
nombres únicos. Cambios de modo: aplicar reglas de `01-SPEC-FUNCIONAL.md` §6
(código de error `PRICING_MODE_CONFLICT` con `details.products` = ids incompletos).

### GET /api/v1/products (extender response)
```jsonc
{
  "data": [{
    // ...campos actuales
    "maxFlavors": 2,
    "priceFrom": 4500,            // min(variants.price) — para tarjetas "desde $45"
    "variants": [
      { "id": "v1", "name": "Chico", "price": 4500, "sortOrder": 0, "active": true }
    ]
  }]
}
```

### POST/PUT /api/v1/products (extender request)
Acepta `variants[]` (upsert por `id`; sin `id` = crear; ausente en el array = desactivar)
y `maxFlavors`. Validaciones por modo de la categoría del producto:
- VARIANTS → al menos 1 variante activa con `price > 0`; nombres del esquema.
- PRESENTATION → `basePrice > 0` y `maxFlavors >= 1`.
- FIXED → si `basePrice = 0`, response 200 con `warnings: ["ZERO_PRICE"]` (el dashboard
  decide cómo mostrarlo; no es error para no romper flujos existentes).

## 3. FASE 2 — Sabores

### CRUD de catálogo
```
GET    /api/v1/categories/:id/flavors            → { data: CategoryFlavor[] }
POST   /api/v1/categories/:id/flavors            { name, priceDelta?, sortOrder? }
PUT    /api/v1/categories/:id/flavors/:flavorId  { name?, priceDelta?, sortOrder?, active? }
PATCH  /api/v1/categories/:id/flavors/:flavorId/sold-out   { soldOut: boolean }
```
El PATCH es endpoint separado porque el POS lo usa como toggle rápido (también offline,
ver doc 05 §5). Permisos: dueño = todo; cajero = solo `sold-out` (alinear con perfiles
existentes en `src/routes/profiles.ts`).

## 4. FASES 1-2 — Creación de órdenes (`POST /api/v1/orders` y bulk sync)

### Request (campos nuevos por ítem, opcionales para compat)
```jsonc
{
  "items": [{
    "productId": "…",
    "quantity": 1,
    "unitPrice": 30000,
    "variantId": "…",                 // requerido si categoría VARIANTS
    "flavors": [                       // requerido si categoría PRESENTATION
      { "flavorId": "…", "quantity": 2 },
      { "flavorId": "…", "quantity": 2 }
    ],
    "modifiers": [ { "optionId": "…", "priceDelta": 1000 } ]
  }]
}
```

### Validación y recálculo server-side (regla RN-02)
```
según pricingMode de la categoría del producto:
  FIXED        → unitPrice esperado = product.basePrice; variantId/flavors deben venir vacíos
  VARIANTS     → variantId requerido, debe pertenecer al producto y estar activo;
                 unitPrice esperado = variant.price
  PRESENTATION → flavors requerido; 1 <= Σ flavors.quantity <= product.maxFlavors;
                 cada flavor de la misma categoría, active y !soldOut;
                 unitPrice esperado = product.basePrice
totalPrice = (unitPrice + Σ modifiers.priceDelta + Σ flavors.priceDelta×qty) × quantity
```
Errores: `VARIANT_REQUIRED`, `VARIANT_INVALID`, `FLAVORS_REQUIRED`, `FLAVORS_EXCEED_MAX`,
`FLAVOR_SOLD_OUT`, `PRICE_MISMATCH` (con `details` de lo esperado vs recibido).

Órdenes offline encoladas: si al sincronizar un sabor ya está `soldOut`, la orden SÍ se
acepta (la venta física ya ocurrió); el rechazo por `FLAVOR_SOLD_OUT` aplica solo a
órdenes en línea. Snapshot de `flavorName`/`variantName`/`priceDelta` al insertar,
mismo patrón que `optionName` (order.service.ts línea 122).

## 5. FASE 3 — Reportes (`GET /api/v1/reports/dashboard`)

**Archivo:** `src/services/report.service.ts`. Claves NUEVAS, presentes solo si hay datos
(el frontend ya es defensivo: `DashboardHome.tsx` líneas 113-115 usan `?? []`):

```jsonc
{
  // ...claves actuales sin cambios
  "byVariant":  [ { "variantName": "Grande", "revenue": 420000, "units": 61 } ],
  "topFlavors": [ { "name": "Mango", "units": 84 } ],
  "extras": {
    "attachRate": 0.34,          // ítems con ≥1 modificador de pago / ítems totales
    "top": [ { "name": "Hot cheetos", "revenue": 84000, "units": 84 } ]
  }
}
```

Implementación: mismas agregaciones en memoria que `topProducts` —
`byVariant` agrupa `items` por `variantName`; `topFlavors` suma `OrderItemFlavor.quantity`
(incluir la relación en el query de orders del período); `extras` desde `OrderItemModifier`
con `priceDelta > 0`. No hay panel "byPresentation": `topProducts` ya lo es (RN-01).

## 6. Checklist de compatibilidad

- [ ] Payloads viejos del POS (sin campos nuevos) siguen aceptándose mientras la categoría sea FIXED.
- [ ] `shared/types` actualizado (enum `PricingMode`, `ProductVariant`, `CategoryFlavor`,
      `CartItemFlavor`) y consumido por ambos lados — es la fuente de verdad de enums.
- [ ] Deliverect: mapeo de `deliverectPlu` por variante documentado en `docs/INTEGRATIONS.md`
      (no bloquea fases 0-2; el módulo delivery está fuera del frontend actual).
- [ ] Clip/terminal: sin cambios — el monto viene del total de orden, no de la estructura de líneas.
- [ ] Webhooks/eventos existentes (`src/routes/events.ts`): verificar si serializan items
      (agregar campos nuevos como opcionales).
