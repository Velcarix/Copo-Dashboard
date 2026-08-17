# PENDIENTES — decisiones abiertas (combos configurables)

> Marcar cada punto como resuelto con la decisión y fecha. Nada aquí bloquea empezar la
> Fase A salvo lo etiquetado [BLOQUEANTE].
>
> Ver `HANDOFF-BACKEND-FASE-A.md` para el punto de entrada operativo de la sesión que
> implemente Fase A (orden de trabajo, anclas de archivo/línea contra el código real).

## Para Bernardo (backend / BD)

1. ~~**[BLOQUEANTE] Forma real de `Category` en producción**~~ — **RESUELTO 2026-08-16**:
   verificado contra `Copo/backend/prisma/schema.prisma:263` (repo activo, no el
   snapshot `test/`). `Category.id String @id` (ULID), igual que el resto del schema.
   `ComboSlot.categoryId` no tiene ningún conflicto de tipos.
2. ~~**[BLOQUEANTE] Self-relation en `OrderItem`**~~ — **RESUELTO 2026-08-16**:
   verificado contra `schema.prisma:603`. `OrderItem` hoy no tiene ninguna self-relation;
   agregar `parentItemId`/`children` (`ComboChildren`) no choca con nada existente.
3. **`comboChildDelta` en el hijo: ¿se guarda o se deriva?** — Recomendación: derivarlo de
   `flavors` + `ComboSlotOption.priceDelta` para no duplicar fuente de verdad. Decidir.
4. **Facturación CFDI del combo** — Recomendación: **una partida = el combo** (hereda
   `satProductCode/satUnitCode` del producto COMBO); los hijos son informativos. Validar con
   quien lleve facturación si algún régimen exige desglosar partidas.
5. **Baja de `ComboComponent`** — cuándo se deja de leer y cuándo se dropea la tabla (tras
   confirmar backfill correcto en producción).
6. **`topProducts` filtro `parentItemId IS NULL`** — confirmar todas las queries que suman
   `OrderItem.totalPrice` para no colar hijos $0 (report.service, cierres de caja, exports).

## Para Roberto (producto)

7. **Precio dentro del combo: ¿flat siempre, o permitir delta por presentación?** — El spec
   asume **flat por defecto** + delta opcional por opción (RN-C02). ¿Hay combos reales donde
   "litro" deba costar más que "vaso" dentro del mismo combo? Si es común, quizá convenga un
   modo de slot "precio = precio del producto" además del delta manual.
8. **Sabores premium dentro de combos: ¿suman o van incluidos?** — El spec los **suma**
   (RN-C03, coherente con producto suelto). Confirmar que es lo esperado comercialmente (un
   "3×2" con un sabor premium costaría el combo + ese premium).
9. **Límite de unidades por slot** — el schema pone `max 20`. ¿Suficiente? (combos de
   heladería suelen ser ≤ 6).
10. **UX de "3 iguales rápido"** — validar con ChunkyDogs si "Repetir anterior" + recordar
    última presentación basta, o si quieren un "aplicar a todas".
11. **¿Combos con opción "sin sabor" / presentaciones sin sabores?** — algunas presentaciones
    (ej. una paleta empaquetada) no piden sabor aunque estén en una categoría PRESENTATION.
    Hoy `maxFlavors >= 1` obliga sabor. ¿Hace falta `maxFlavors = 0`? (afecta también a
    modos-de-cobro).

## Descartado (no reabrir sin razón nueva)

- **Guardar selección de combo como `Json` en el raíz** — descartado: rompe joins de
  inventario, `topFlavors`, cocina y CFDI. Ver `02-DATA-MODEL-BD.md` §3.
- **Cobrar el precio absoluto de la variante dentro del combo** — descartado: el combo es
  flat; la variante se registra pero no cobra (RN-C05). Sobreprecios via `priceDelta`.

## Orden sugerido de ejecución

1. Bernardo: resolver 1-2, migración + backfill (dry-run), endpoints y validación (doc 03).
2. En paralelo tras backend: Dashboard (paquete B) y POS (paquete C) en sesiones separadas.
3. Reportes (D) al final.
