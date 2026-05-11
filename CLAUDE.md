# Copo — Frontend (POS + Dashboard)

> Lee primero `../../CLAUDE.md` (raíz). Este archivo agrega contexto específico del frontend.

## Tu responsabilidad

Construir dos apps en una:
1. **POS** (`/pos/*`) — pantalla del cajero. Táctil, rápida, offline-first.
2. **Dashboard** (`/dashboard/*`) — pantalla del dueño. Reportes, inventario, configuración.

El cajero nunca ve el dashboard. El dueño puede usar ambos.

## Estructura de carpetas

```
frontend/
├── src/
│   ├── apps/
│   │   ├── pos/           ← todo lo del cajero
│   │   └── dashboard/     ← todo lo del dueño
│   ├── shared/
│   │   ├── components/    ← componentes usados en ambas apps
│   │   ├── hooks/         ← hooks compartidos
│   │   └── lib/
│   │       ├── db.ts      ← Dexie (IndexedDB) — NO modificar sin leer OFFLINE_STRATEGY.md
│   │       ├── sync.ts    ← cola de sincronización offline
│   │       └── api.ts     ← cliente HTTP (usa fetch con interceptores)
│   └── main.tsx
├── public/
│   └── sw.js              ← Service Worker — editar con MUCHO cuidado
└── vite.config.ts
```

## POS — reglas de diseño (no negociables)

- **Una venta en menos de 5 taps.** Si un flujo requiere más, rediseñar.
- **Sin texto de estado en botones de acción.** Usar spinners visuales, no "Cargando...".
- **El total siempre visible** mientras el cajero arma el carrito. Nunca oculto.
- **Botón "Cobrar"** siempre en la esquina inferior derecha, fondo verde, tamaño mínimo 60×60px.
- **Productos como grid de tarjetas con foto**, no lista de texto.
- **Offline badge**: cuando no hay internet, mostrar `⚠ Sin conexión — ventas guardadas` en header. No bloquear la UI.

## Estado del POS

```
POS usa Zustand para estado en memoria +
Dexie para persistencia local (carrito pendiente, ventas offline).

Nunca guardar en localStorage — usar solo Dexie.
```

Ver `src/apps/pos/store/cartStore.ts` para el estado del carrito.
Ver `src/shared/lib/db.ts` para el esquema Dexie.

## Flujo de cobro con terminal Clip (IMPORTANTE)

```
1. Usuario toca "Cobrar con tarjeta"
2. Frontend llama POST /api/payments/terminal-intent  { amount, orderId }
3. Backend crea Payment Intent en Clip API y retorna { intentId, status: "pending" }
4. Frontend abre <PaymentWaitingModal> y hace polling a GET /api/payments/:intentId/status
5. Backend recibe webhook de Clip → actualiza estado en DB
6. Polling detecta status: "completed" | "declined" | "cancelled"
7. Frontend cierra modal y muestra resultado
```

Ver `docs/INTEGRATIONS.md#clip` para los estados del webhook y gotchas.

## Dashboard — componentes clave

- `<MetricCard>` — número grande + etiqueta + tendencia. Props en `shared/components/MetricCard.tsx`.
- `<SalesChart>` — usa Recharts. Siempre responsive, nunca ancho fijo.
- `<InventoryAlert>` — aparece cuando hay stock bajo. Clickeable → va a inventario.
- `<ReportTable>` — tabla paginada reutilizable para todos los reportes.

## Autenticación

```
Dueño: JWT en memoria (no localStorage). Refresh token en httpOnly cookie.
Cajero: PIN de 4 dígitos, verificado localmente contra hash en Dexie.
        El PIN se sincroniza del servidor solo cuando hay internet.

Hook: useAuth() → { user, role, login, logout }
```

## Gotchas conocidos

- **Dexie y SSR**: Dexie no funciona en SSR. Todo código que use `db` debe estar en
  componentes con `use client` o dentro de `useEffect`.
- **Service Worker en dev**: Vite desactiva el SW en desarrollo. Para testear offline,
  hacer `npm run build && npm run preview` y activar "Offline" en DevTools Network.
- **Imágenes de productos**: Se sirven desde el CDN del backend. Usar `<ProductImage>`
  que incluye fallback automático si la imagen no carga.
- **Montos**: El backend manda centavos. Usar `formatCurrency(amountInCents)` de
  `src/shared/lib/currency.ts`. NUNCA dividir manualmente entre 100 en los componentes.
- **Polling del terminal**: Máximo 90 segundos. Después de eso, mostrar error de timeout
  y dejar al cajero reintentar o cancelar.

## Tests

```bash
npm run test              # Vitest unit tests
npm run test:e2e          # Playwright (requiere backend corriendo)
```

Cada componente nuevo necesita al menos un test de renderizado.
Los flujos críticos (cobro, cierre de caja) necesitan test de integración en Playwright.
