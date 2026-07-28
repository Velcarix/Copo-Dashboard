# Modos de cobro — Paquete de specs

> Rediseño de la configuración de productos para que heladerías, cafeterías y negocios
> de mostrador (banderillas, galletas) configuren su menú sin doblar el sistema de
> modificadores, y para que las métricas del dashboard reflejen dinero real.
>
> Creado: 2026-07-03 · Autor: Roberto + Claude · Estado: borrador para revisión con Bernardo

## El problema (resumen)

Copo solo tiene un concepto de configuración: grupos de modificadores `+$`. Las heladerías
lo usan para modelar el precio (base $0 + "cono/vaso/botes" como grupos), lo que produce:

1. **Métricas en $0** — `topProducts` y `salesByCategory` suman `OrderItem.totalPrice`,
   que hoy se guarda SIN modificadores (bug confirmado, ver `03-BACKEND-API.md` §1).
2. **Ventas en $0 posibles** — grupos no requeridos + botón Agregar habilitado.
3. **Configuración duplicada** — los mismos 3 grupos copiados en cada sabor (~12 productos).
4. **Combos inarmables** — el precio no vive en el producto, así que el combo no tiene a qué apuntar.

## La solución (resumen)

Cada **categoría** declara su modo de cobro (`pricingMode`):

| Modo | Quién | El precio vive en |
|---|---|---|
| `FIXED` | Galletas, banderillas, pastelería | El producto (`basePrice`) — como hoy |
| `VARIANTS` | Cafetería, crepas | Variantes por producto (Latte chico $45 / grande $65) |
| `PRESENTATION` | Heladería, paletería, aguas | El producto ES la presentación (Litro $300); los sabores son catálogo de la categoría |

Un solo dashboard y un solo POS para todos: los paneles y flujos se adaptan según los
modos presentes en el catálogo, no según un "tipo de negocio".

**Decisión clave de diseño:** en modo `PRESENTATION` las presentaciones son filas de
`Product` (no una entidad nueva). Así `topProducts`, combos (`ComboComponent.componentId`),
recetas de inventario y facturación siguen funcionando sin tocar sus joins.

## Repos afectados

| Repo | Ubicación | Qué cambia |
|---|---|---|
| Frontend POS + Dashboard | `C:\Users\Roberto1\Desktop\Copo-Dashboard` (este repo) | Paquetes `dashboard/` y `pos/` |
| Backend + Prisma | Monorepo Copo (Bernardo, desplegado en api.copopos.com) | Docs 02 y 03 |

⚠️ El snapshot local del backend (`Desktop\Copo\backend`) está desactualizado respecto
al desplegado: el frontend ya consume `GET /api/v1/categories` y esa ruta no existe en el
snapshot. Bernardo debe reconciliar el doc 02 contra el schema real antes de migrar.

## Documentos y orden de lectura

**Comunes (leer primero):**

1. `01-SPEC-FUNCIONAL.md` — qué se construye y por qué. Reglas de negocio y criterios de aceptación.
2. `02-DATA-MODEL-BD.md` — cambios Prisma, migraciones y backfill (backend / Bernardo).
3. `03-BACKEND-API.md` — bugfix de `totalPrice`, endpoints y validaciones (backend / Bernardo).

**Paquetes por app (independientes entre sí, cada uno con su README-checklist):**

- `dashboard/` — README con checklist por fase + `04-FRONTEND-DASHBOARD.md` (editor de categorías/productos, sabores, dashboard adaptativo).
- `pos/` — README con checklist por fase + `05-FRONTEND-POS.md` (selector de variante, FlavorPicker, carrito, offline Dexie/sync).

Los dos paquetes de frontend dependen del backend de su misma fase, pero no uno del otro:
se pueden trabajar en sesiones/PRs separados.

## Fases (orden de implementación)

> **Estado 2026-07-07:** Dashboard (F0-F3) ✅ en master de Copo-Dashboard · POS mobile (F1-F2) ✅ en master de Copo ·
> Backend F0 + F1-F2 ✅ implementado en la rama `fix/orderitem-totalprice-modifiers` del repo Copo
> (2 commits, typecheck limpio) — **pendiente: push, PR, `prisma migrate dev --name add_pricing_modes` y backfill (Bernardo)**.

| Fase | Contenido | Riesgo | Dependencias |
|---|---|---|---|
| **0 — Quick wins** | Bugfix `totalPrice` + backfill + guardrails anti-$0 en editor | Bajo | Ninguna. **Hacer ya** — arregla las métricas del cliente actual sin rediseño |
| **1 — Variantes** | `pricingMode` en Category, `ProductVariant`, editor VARIANTS, POS selector de variante | Medio | Fase 0 |
| **2 — Presentación + sabores** | `CategoryFlavor`, `OrderItemFlavor`, `maxFlavors`, FlavorPicker en POS, migración del cliente piloto | Medio-alto | Fase 1 |
| **3 — Dashboard adaptativo + combos** | Claves opcionales en reports (`byVariant`, `topFlavors`, `extras`), paneles condicionales, combos v2 | Bajo | Fases 1-2 |

Cada fase es desplegable por sí sola y compatible hacia atrás (campos nuevos opcionales,
`pricingMode` default `FIXED`).

## Criterio de éxito global

- El cliente heladería configura su menú completo (5 presentaciones + 12 sabores + extras) en menos de 15 minutos y sin ayuda.
- Cero ventas registrables en $0 cuando la categoría define precio.
- `Ventas por forma de pago` == `Σ topProducts` en un día sin descuentos (hoy no cuadran).
- Alta de un sabor nuevo = 1 acción (hoy: producto nuevo + 3 grupos copiados).
