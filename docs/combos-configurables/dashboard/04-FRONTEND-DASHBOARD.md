# 04 — Frontend Dashboard: editor de combos por slots

> Reescribe `src/apps/dashboard/pages/CreateComboModal.tsx`. El resto del dashboard casi no
> cambia. Reusa tokens de estilo y patrones del modal actual (ya buenos).

## 1. De dónde partimos (código actual)

`CreateComboModal.tsx` hoy:
- Estado: `name`, `priceText`, `components: {productId,name,basePrice,quantity}[]`.
- **Excluye VARIANTS** a propósito (líneas 44-49) — se elimina esa exclusión.
- Payload: `POST /api/v1/products/combo { branchId, name, basePrice, components:[{productId,quantity}] }` (líneas 95-100).
- `canSave = name && priceInCents>0 && components.length>=2`.

## 2. A dónde llegamos (modelo de estado nuevo)

```ts
type SlotSource = 'CATEGORY' | 'SPECIFIC_PRODUCTS'

interface DraftSlotOption { productId: string; name: string; priceDelta: number }
interface DraftSlot {
  key: string            // id local (nanoid) para el editor
  name: string           // "Elige tu helado"
  quantity: number       // unidades a elegir
  source: SlotSource
  categoryId?: string    // si CATEGORY
  options: DraftSlotOption[] // si SPECIFIC_PRODUCTS
}

const [name, setName] = useState('')
const [priceText, setPriceText] = useState('')
const [slots, setSlots] = useState<DraftSlot[]>([])
```

`canSave = name.trim() && priceInCents > 0 && slots.length >= 1 && totalUnits >= 2 &&
slots.every(slotIsValid)` donde `totalUnits = Σ slot.quantity` y `slotIsValid` = (CATEGORY
con `categoryId`) o (SPECIFIC_PRODUCTS con `options.length >= 1`).

## 3. UI del editor (secciones del modal)

1. **Nombre + precio del combo** (igual que hoy; conservar el botón "Sugerido").
   - El "sugerido" ahora suma el `basePrice` de las opciones/categorías representativas; si
     el slot es de categoría, usar el producto más barato como referencia (informativo).
2. **Lista de slots** (nuevo bloque, reemplaza la lista de productos):
   - Card por slot con: input Nombre, stepper Cantidad, toggle de Origen.
   - Origen `Categoría`: `<select>` de categorías (mostrar chip con su `pricingMode`:
     "por presentación" / "por tamaño" / "precio único" para orientar al dueño).
   - Origen `Productos específicos`: buscador + lista con checkbox (reusar el patrón de
     selección actual, líneas 206-235) + por opción un input de delta "+$" opcional.
   - Botón "Eliminar slot". Botón "＋ Agregar slot".
3. **Aviso de precio flat**: texto fijo — "El precio del combo es fijo. Elegir cono, vaso o
   litro no cambia el precio salvo que agregues un '+$' a una opción." (mata la confusión
   que Roberto describe).
4. **Preview del cajero** (bloque colapsable): renderiza, en seco, los pasos que verá el POS:
   "Paso 1 · Elige tu helado (1 de 3) → [presentaciones] → sabores (máx N)"… Se arma solo
   con el estado `slots` + catálogo; no llama al backend.

## 4. Elegibilidad de productos (cambio clave)

```ts
// ANTES: excluía COMBO y VARIANTS.
// AHORA: solo excluye COMBO (no se anidan combos). VARIANTS y PRESENTATION son válidos.
const eligibleProducts = products.filter(p => p.active && p.category !== ProductCategory.COMBO)
```

- Para slots `SPECIFIC_PRODUCTS` se listan todos los elegibles; junto a cada uno, el
  `pricingMode` de su categoría (para que el dueño sepa que ahí el cajero elegirá
  sabor/variante).
- Para slots `CATEGORY` basta elegir la categoría; las opciones las expande el backend al
  serializar (doc 03 §2). El editor puede mostrar un conteo ("12 productos activos").

## 5. Payload de guardado

```ts
await api.post('/api/v1/products/combo', {
  branchId,
  name: name.trim(),
  basePrice: priceInCents,
  slots: slots.map(s => ({
    name: s.name.trim(),
    quantity: s.quantity,
    source: s.source,
    categoryId: s.source === 'CATEGORY' ? s.categoryId : undefined,
    options: s.source === 'SPECIFIC_PRODUCTS'
      ? s.options.map(o => ({ productId: o.productId, priceDelta: o.priceDelta }))
      : [],
  })),
})
```

Edición: `PUT /api/v1/products/combo/:id` con el mismo shape; cargar con `GET /products/:id`
y mapear `comboSlots` → `DraftSlot[]`.

## 6. Migración visible

Un combo viejo llega desde el backend ya convertido (backfill, doc 02 §4) a varios slots
`SPECIFIC_PRODUCTS` de una sola opción con `quantity` del componente. El editor lo muestra
tal cual; el dueño puede: subir la cantidad, cambiar a origen `Categoría`, agregar opciones,
etc. No hay estado "combo viejo" especial en el frontend.

## 7. Tests (Vitest + Testing Library)
- Render del modal con 0 slots → `canSave=false`.
- Agregar 1 slot CATEGORY quantity 3 + precio → `canSave=true`; payload correcto.
- Agregar slot SPECIFIC_PRODUCTS sin opciones → inválido; con 1 opción → válido.
- VARIANTS ahora seleccionable (regresión del fix de exclusión).
- Preview arma los pasos esperados para un combo de 2 slots.
- Editar combo migrado: carga `comboSlots` y re-serializa sin pérdida.

## 8. Fuera de alcance (dashboard)
- Selección de sabores/variantes concretas en el editor: eso es del cajero en el POS, no del
  dueño (RN-C: el combo define el "qué se puede elegir", no el "qué se eligió").
- Panel de reportes de combos: fase D, depende del backend.
