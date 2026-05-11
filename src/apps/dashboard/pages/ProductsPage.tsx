import { useEffect, useState } from 'react'
import { api, ApiError } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { ProductCategory, ModifierInputType } from '@shared-types'
import type { ModifierGroupConfig, ModifierOptionConfig, IngredientAdjustment } from '@shared-types'
import { useCategoryStore, useSortedCategories, CATEGORY_DEFAULTS } from '@/shared/store/categoryStore'

const MODIFIER_TYPE_LABELS: Record<ModifierInputType, string> = {
  [ModifierInputType.SELECT]:  'Selección (elige uno)',
  [ModifierInputType.SIZE]:    'Tamaño (con precio)',
  [ModifierInputType.NUMERIC]: 'Cantidad numérica',
  [ModifierInputType.WEIGHT]:  'Peso / gramos',
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.ICE_CREAM]: 'Helados',
  [ProductCategory.COFFEE]:    'Café',
  [ProductCategory.PASTRY]:    'Pasteles',
  [ProductCategory.COMBO]:     'Combos',
  [ProductCategory.EXTRA]:     'Extras',
  [ProductCategory.SNACK]:     'Snacks',
  [ProductCategory.BEVERAGE]:  'Bebidas',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string
  name: string
  unit: string          // "grams" | "liters" | "units" | etc.
  currentStock: number
}

const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Vainilla',     unit: 'grams',  currentStock: 800  },
  { id: 'i2', name: 'Chocolate',    unit: 'grams',  currentStock: 3200 },
  { id: 'i3', name: 'Leche entera', unit: 'liters', currentStock: 3    },
  { id: 'i4', name: 'Fresa',        unit: 'grams',  currentStock: 5400 },
  { id: 'i5', name: 'Café molido',  unit: 'grams',  currentStock: 2100 },
]

// Map inventory unit strings → short display unit
function inventoryUnitToShort(unit: string): string {
  const map: Record<string, string> = {
    grams: 'g', kilograms: 'kg', liters: 'L', milliliters: 'ml',
    units: 'pza', pieces: 'pza',
  }
  return map[unit.toLowerCase()] ?? unit
}

interface Ingredient {
  id: string
  inventoryItemId: string   // always linked to an inventory item
  name: string              // denormalized for display
  quantity: string
  unit: string
}

interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory | string  // string allows custom categories
  basePrice: number
  active: boolean
  imageUrl: string | null
  ingredients: Ingredient[]
  modifierGroups: ModifierGroupConfig[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID() }

// ── Product thumbnail / placeholder ──────────────────────────────────────────

function ProductThumb({ name, category: _category, imageUrl, size = 40, color }: { name: string; category: string; imageUrl: string | null; size?: number; color?: string }) {
  const resolvedColor = color ?? '#6b7280'
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-xl object-cover"
        style={{ width: size, height: size, minWidth: size }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  return (
    <div
      className="rounded-xl flex items-center justify-center font-bold text-white select-none"
      style={{ width: size, height: size, minWidth: size, background: resolvedColor, fontSize: size * 0.38 }}
    >
      {initials || '?'}
    </div>
  )
}

function emptyProduct(): Omit<Product, 'id'> {
  return {
    name: '',
    description: '',
    category: ProductCategory.ICE_CREAM,
    basePrice: 0,
    active: true,
    imageUrl: null,
    ingredients: [],
    modifierGroups: [],
  }
}

function emptyOption(groupId: string): ModifierOptionConfig {
  return { id: uid(), groupId, name: '', priceDelta: 0, sortOrder: 0 }
}

// ── Inventory picker — muestra todos los insumos, filtra con buscador ─────────

function InventoryPicker({
  inventoryItems,
  excludeIds,
  onSelect,
}: {
  inventoryItems: InventoryItem[]
  excludeIds: string[]
  onSelect: (item: InventoryItem) => void
}) {
  const [query, setQuery] = useState('')

  const available = inventoryItems.filter(i => !excludeIds.includes(i.id))
  const filtered = query.trim()
    ? available.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : available

  if (available.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Buscador — solo si hay más de 5 insumos */}
      {available.length > 5 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)] shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar insumo…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-base leading-none">×</button>
          )}
        </div>
      )}

      {/* Lista de insumos disponibles */}
      <div className="flex flex-wrap gap-2">
        {filtered.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-colors"
          >
            <span>+</span>
            <span>{item.name}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{item.currentStock} {inventoryUnitToShort(item.unit)}</span>
          </button>
        ))}
        {filtered.length === 0 && query && (
          <p className="text-xs text-[var(--color-text-muted)] italic px-1">Sin resultados para "{query}"</p>
        )}
      </div>
    </div>
  )
}

// ── Ingredient editor ─────────────────────────────────────────────────────────

function IngredientsEditor({
  ingredients,
  inventoryItems,
  onChange,
}: {
  ingredients: Ingredient[]
  inventoryItems: InventoryItem[]
  onChange: (ing: Ingredient[]) => void
}) {
  function add(item: InventoryItem) {
    const unit = inventoryUnitToShort(item.unit)
    onChange([...ingredients, { id: uid(), inventoryItemId: item.id, name: item.name, quantity: '', unit }])
  }
  function remove(id: string) { onChange(ingredients.filter(i => i.id !== id)) }
  function updateQty(id: string, quantity: string) {
    onChange(ingredients.map(i => i.id === id ? { ...i, quantity } : i))
  }

  const usedIds = ingredients.map(i => i.inventoryItemId)

  return (
    <div className="space-y-2">
      {/* Configured ingredients */}
      {ingredients.map(ing => (
        <div key={ing.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
          <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">{ing.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              value={ing.quantity}
              onChange={e => updateQty(ing.id, e.target.value)}
              placeholder="Cant."
              min="0"
              step="any"
              autoFocus={!ing.quantity}
              className="w-20 px-2 py-1 text-sm text-right rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <span className="text-xs text-[var(--color-text-muted)] w-6">{ing.unit}</span>
          </div>
          <button type="button" onClick={() => remove(ing.id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-base leading-none px-0.5 transition-colors">×</button>
        </div>
      ))}

      {/* Add from inventory */}
      {inventoryItems.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] italic px-1">
          No hay insumos en el inventario. Agrégalos primero en la sección Inventario.
        </p>
      ) : usedIds.length === inventoryItems.length ? (
        <p className="text-xs text-[var(--color-text-muted)] italic px-1">Todos los insumos del inventario ya están agregados.</p>
      ) : (
        <InventoryPicker
          inventoryItems={inventoryItems}
          excludeIds={usedIds}
          onSelect={add}
        />
      )}
    </div>
  )
}

// ── Option ingredient config ──────────────────────────────────────────────────

function OptionIngredientConfig({
  option,
  inventoryItems,
  onChange,
}: {
  option: ModifierOptionConfig
  inventoryItems: InventoryItem[]
  onChange: (o: ModifierOptionConfig) => void
}) {
  const mode = option.ingredientMode ?? 'none'

  function setMode(m: 'none' | 'multiply' | 'custom') {
    const next: ModifierOptionConfig = { ...option, ingredientMode: m }
    if (m === 'multiply' && !next.ingredientMultiplier) next.ingredientMultiplier = 1
    if (m === 'custom' && !next.ingredientAdjustments) next.ingredientAdjustments = []
    onChange(next)
  }

  function addAdj(item: InventoryItem) {
    const unit = inventoryUnitToShort(item.unit)
    const adj: IngredientAdjustment = { id: uid(), inventoryItemId: item.id, name: item.name, quantity: 1, unit }
    onChange({ ...option, ingredientAdjustments: [...(option.ingredientAdjustments ?? []), adj] })
  }

  function updateAdj(id: string, patch: Partial<IngredientAdjustment>) {
    onChange({
      ...option,
      ingredientAdjustments: (option.ingredientAdjustments ?? []).map(a => a.id === id ? { ...a, ...patch } : a),
    })
  }

  function removeAdj(id: string) {
    onChange({ ...option, ingredientAdjustments: (option.ingredientAdjustments ?? []).filter(a => a.id !== id) })
  }

  const usedIds = (option.ingredientAdjustments ?? []).map(a => a.inventoryItemId)

  const MODES = [
    { id: 'none',     label: 'No descuenta nada' },
    { id: 'multiply', label: 'Usa más de lo mismo' },
    { id: 'custom',   label: 'Usa otros insumos' },
  ] as const

  return (
    <div className="mt-2 ml-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2.5">
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">¿Qué descuenta del inventario esta opción?</p>

      <div className="flex flex-wrap gap-2">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={[
              'px-2.5 py-1 text-xs rounded-full border transition-colors',
              mode === m.id
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white font-semibold'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* multiply */}
      {mode === 'multiply' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Veces los ingredientes del producto:</span>
          <input
            type="number"
            value={option.ingredientMultiplier ?? 1}
            onChange={e => onChange({ ...option, ingredientMultiplier: parseFloat(e.target.value) || 1 })}
            min="0.1"
            step="0.5"
            className="w-20 px-2 py-1 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
          />
          <span className="text-xs text-[var(--color-text-muted)]">×</span>
        </div>
      )}

      {/* custom: pick from inventory */}
      {mode === 'custom' && (
        <div className="space-y-2">
          {(option.ingredientAdjustments ?? []).map(adj => (
            <div key={adj.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
              <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">{adj.name}</span>
              <input
                type="number"
                value={adj.quantity}
                onChange={e => updateAdj(adj.id, { quantity: parseFloat(e.target.value) || 0 })}
                min="0"
                step="any"
                className="w-20 px-2 py-1 text-sm text-right rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-xs text-[var(--color-text-muted)] w-6">{adj.unit}</span>
              <button type="button" onClick={() => removeAdj(adj.id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-base leading-none px-0.5 transition-colors">×</button>
            </div>
          ))}

          {inventoryItems.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] italic">No hay insumos en el inventario.</p>
          ) : usedIds.length < inventoryItems.length ? (
            <InventoryPicker
              inventoryItems={inventoryItems}
              excludeIds={usedIds}
              onSelect={addAdj}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Option row inside a modifier group ────────────────────────────────────────

function OptionRow({
  option,
  onChange,
  onRemove,
  inventoryItems,
}: {
  option: ModifierOptionConfig
  onChange: (o: ModifierOptionConfig) => void
  onRemove: () => void
  inventoryItems?: InventoryItem[]
}) {
  const [showIngConfig, setShowIngConfig] = useState(false)
  const hasIngMode = option.ingredientMode && option.ingredientMode !== 'none'

  return (
    <div className="pl-4 space-y-1">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={option.name}
          onChange={e => onChange({ ...option, name: e.target.value })}
          placeholder="Nombre (ej. Grande)"
          className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
        />
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">+$</span>
          <input
            type="number"
            value={option.priceDelta / 100}
            onChange={e => onChange({ ...option, priceDelta: Math.round(Math.max(0, parseFloat(e.target.value || '0')) * 100) })}
            placeholder="0.00"
            min="0"
            step="0.50"
            className="w-20 px-2 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
          />
        </div>
        <label className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
          <input
            type="checkbox"
            checked={option.isDefault ?? false}
            onChange={e => onChange({ ...option, isDefault: e.target.checked })}
          />
          Default
        </label>
        {/* Inventory toggle button */}
        {inventoryItems !== undefined && (
          <button
            type="button"
            title="¿Qué descuenta del inventario esta opción?"
            onClick={() => setShowIngConfig(v => !v)}
            className={[
              'px-2 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap',
              hasIngMode
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                : showIngConfig
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
            ].join(' ')}
          >
            {hasIngMode ? 'Inventario ✓' : 'Inventario'}
          </button>
        )}
        <button type="button" onClick={onRemove} className="text-[var(--color-danger)] text-sm px-1">✕</button>
      </div>

      {showIngConfig && inventoryItems !== undefined && (
        <OptionIngredientConfig
          option={option}
          inventoryItems={inventoryItems}
          onChange={onChange}
        />
      )}
    </div>
  )
}

// ── Modifier group editor ─────────────────────────────────────────────────────

function ModifierGroupEditor({
  group,
  onChange,
  onRemove,
  inventoryItems,
}: {
  group: ModifierGroupConfig
  onChange: (g: ModifierGroupConfig) => void
  onRemove: () => void
  inventoryItems?: InventoryItem[]
}) {
  function addOption() {
    if (group.inputType === ModifierInputType.SELECT || group.inputType === ModifierInputType.SIZE) {
      const updated = {
        ...group,
        options: [...(group.options ?? []), emptyOption(group.id)],
      } as ModifierGroupConfig
      onChange(updated)
    }
  }

  function updateOption(optId: string, opt: ModifierOptionConfig) {
    if (group.inputType !== ModifierInputType.SELECT && group.inputType !== ModifierInputType.SIZE) return
    onChange({
      ...group,
      options: group.options.map(o => o.id === optId ? opt : o),
    } as ModifierGroupConfig)
  }

  function removeOption(optId: string) {
    if (group.inputType !== ModifierInputType.SELECT && group.inputType !== ModifierInputType.SIZE) return
    onChange({
      ...group,
      options: group.options.filter(o => o.id !== optId),
    } as ModifierGroupConfig)
  }

  const hasOptions = group.inputType === ModifierInputType.SELECT || group.inputType === ModifierInputType.SIZE
  const options = hasOptions ? (group as { options: ModifierOptionConfig[] }).options ?? [] : []

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-3 space-y-3 bg-[var(--color-bg)]">
      {/* Group header */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={group.name}
            onChange={e => onChange({ ...group, name: e.target.value })}
            placeholder="Nombre del grupo (ej. Tamaño, Presentación)"
            className="w-full px-2 py-1.5 text-sm font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <div className="flex gap-2 flex-wrap">
            <select
              value={group.inputType}
              onChange={e => {
                const t = e.target.value as ModifierInputType
                const base = { id: group.id, productId: group.productId, name: group.name, required: group.required, multiple: group.multiple, sortOrder: group.sortOrder }
                if (t === ModifierInputType.SELECT || t === ModifierInputType.SIZE) {
                  onChange({ ...base, inputType: t, options: [] } as ModifierGroupConfig)
                } else {
                  onChange({ ...base, inputType: t } as ModifierGroupConfig)
                }
              }}
              className="px-2 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              {Object.values(ModifierInputType).map(t => (
                <option key={t} value={t}>{MODIFIER_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={group.required}
                onChange={e => onChange({ ...group, required: e.target.checked })}
              />
              Requerido
            </label>
            <label className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={group.multiple}
                onChange={e => onChange({ ...group, multiple: e.target.checked })}
              />
              Múltiple selección
            </label>
          </div>
        </div>
        <button type="button" onClick={onRemove} className="text-[var(--color-danger)] text-sm mt-1 px-1">✕</button>
      </div>

      {/* Options (SELECT / SIZE) */}
      {hasOptions && (
        <div className="space-y-2">
          {options.map(opt => (
            <OptionRow
              key={opt.id}
              option={opt}
              onChange={o => updateOption(opt.id, o)}
              onRemove={() => removeOption(opt.id)}
              inventoryItems={inventoryItems}
            />
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-xs text-[var(--color-accent)] hover:underline pl-4"
          >
            + Agregar opción
          </button>
        </div>
      )}

      {/* NUMERIC / WEIGHT config */}
      {(group.inputType === ModifierInputType.NUMERIC || group.inputType === ModifierInputType.WEIGHT) && (
        <div className="flex gap-3 pl-4 flex-wrap">
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">Mín</span>
            <input
              type="number"
              value={(group as { minValue?: number }).minValue ?? ''}
              onChange={e => onChange({ ...group, minValue: Math.max(0, parseFloat(e.target.value) || 0) } as ModifierGroupConfig)}
              min="0"
              className="w-20 px-2 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">Máx</span>
            <input
              type="number"
              value={(group as { maxValue?: number }).maxValue ?? ''}
              onChange={e => onChange({ ...group, maxValue: Math.max(0, parseFloat(e.target.value) || 0) } as ModifierGroupConfig)}
              min="0"
              className="w-20 px-2 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">Precio por unidad ($)</span>
            <input
              type="number"
              value={((group as { pricePerUnit?: number }).pricePerUnit ?? 0) / 100}
              onChange={e => onChange({ ...group, pricePerUnit: Math.round(Math.max(0, parseFloat(e.target.value || '0')) * 100) } as ModifierGroupConfig)}
              min="0"
              className="w-24 px-2 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">Unidad</span>
            <select
              value={(group as { unit?: string }).unit ?? 'g'}
              onChange={e => onChange({ ...group, unit: e.target.value } as ModifierGroupConfig)}
              className="w-20 px-2 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              {['g', 'kg', 'ml', 'oz', 'bola', 'pza'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

// ── Product modal (full configurator) ─────────────────────────────────────────

function ProductModal({
  product,
  onSave,
  onClose,
}: {
  product: Product | 'new'
  onSave: (data: Omit<Product, 'id'> & { id?: string }) => Promise<void>
  onClose: () => void
}) {
  const isNew = product === 'new'
  const [form, setForm] = useState<Omit<Product, 'id'>>(
    isNew ? emptyProduct() : {
      name: product.name,
      description: product.description,
      category: product.category,
      basePrice: product.basePrice,
      active: product.active,
      imageUrl: product.imageUrl,
      ingredients: product.ingredients ?? [],
      modifierGroups: product.modifierGroups ?? [],
    }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'basic' | 'modifiers' | 'ingredients'>('basic')
  const [customCatInput, setCustomCatInput] = useState('')
  const [showCustomCat, setShowCustomCat] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  useEffect(() => {
    api.get<{ data: InventoryItem[] }>('/api/v1/inventory?branchId=default')
      .then(res => setInventoryItems(res.data))
      .catch(() => { if (import.meta.env.DEV) setInventoryItems(MOCK_INVENTORY) })
  }, [])

  function addModifierGroup() {
    const id = uid()
    const newGroup: ModifierGroupConfig = {
      id,
      productId: isNew ? 'new' : (product as Product).id,
      name: '',
      inputType: ModifierInputType.SELECT,
      required: true,
      multiple: false,
      sortOrder: form.modifierGroups.length,
      options: [],
    }
    setForm(f => ({ ...f, modifierGroups: [...f.modifierGroups, newGroup] }))
  }

  function updateGroup(id: string, group: ModifierGroupConfig) {
    setForm(f => ({ ...f, modifierGroups: f.modifierGroups.map(g => g.id === id ? group : g) }))
  }

  function removeGroup(id: string) {
    setForm(f => ({ ...f, modifierGroups: f.modifierGroups.filter(g => g.id !== id) }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (form.basePrice <= 0) { setError('El precio debe ser mayor a 0'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, id: isNew ? undefined : (product as Product).id })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'basic', label: 'General' },
    { id: 'modifiers', label: `Configuraciones (${form.modifierGroups.length})` },
    { id: 'ingredients', label: `Ingredientes (${form.ingredients.length})` },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-[var(--color-surface)] rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text-primary)] text-lg">
            {isNew ? 'Nuevo producto' : `Editar — ${(product as Product).name}`}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl leading-none px-1">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] px-5">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'py-2.5 px-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[420px]">

          {/* ── GENERAL ───────────────────────────────────── */}
          {tab === 'basic' && (
            <>
              {/* Photo + name row */}
              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center gap-2">
                  <ProductThumb name={form.name || '?'} category={form.category} imageUrl={form.imageUrl} size={72} />
                  <label className="text-xs text-[var(--color-accent)] cursor-pointer hover:underline">
                    Foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = URL.createObjectURL(file)
                        setForm(f => ({ ...f, imageUrl: url }))
                      }}
                    />
                  </label>
                  {form.imageUrl && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, imageUrl: null }))} className="text-xs text-[var(--color-danger)] hover:underline">Quitar</button>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="ej. Copa de Helado Especial"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">Descripción</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descripción opcional para el menú..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">Categoría *</label>
                  {showCustomCat ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={customCatInput}
                        onChange={e => setCustomCatInput(e.target.value)}
                        placeholder="Nueva categoría"
                        autoFocus
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customCatInput.trim()) {
                            setForm(f => ({ ...f, category: customCatInput.trim() }))
                            setShowCustomCat(false)
                          }
                          if (e.key === 'Escape') setShowCustomCat(false)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customCatInput.trim()) {
                            setForm(f => ({ ...f, category: customCatInput.trim() }))
                          }
                          setShowCustomCat(false)
                        }}
                        className="px-3 py-2 text-sm rounded-lg bg-[var(--color-accent)] text-white"
                      >OK</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <select
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductCategory }))}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                      >
                        {Object.values(ProductCategory).map(c => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                        ))}
                        {/* custom category not in enum */}
                        {!Object.values(ProductCategory).includes(form.category as ProductCategory) && (
                          <option value={form.category}>{form.category}</option>
                        )}
                      </select>
                      <button
                        type="button"
                        title="Crear categoría nueva"
                        onClick={() => { setCustomCatInput(''); setShowCustomCat(true) }}
                        className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                      >+</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">Precio base *</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[var(--color-text-muted)]">$</span>
                    <input
                      type="number"
                      value={form.basePrice / 100}
                      onChange={e => setForm(f => ({ ...f, basePrice: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                      onFocus={e => e.target.select()}
                      placeholder="35.00"
                      step="0.50"
                      min="0"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                    />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatCurrency(form.basePrice)}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                />
                Activo en el POS (visible para cajeros)
              </label>
            </>
          )}

          {/* ── CONFIGURACIONES / MODIFICADORES ───────────── */}
          {tab === 'modifiers' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                Agrega grupos de opciones que el cajero verá al agregar este producto. Ejemplos: Tamaño, Presentación (cono/vaso), Temperatura, Toppings, Número de bolas.
              </p>
              {form.ingredients.length > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                  Este producto tiene {form.ingredients.length} ingrediente{form.ingredients.length > 1 ? 's' : ''} configurado{form.ingredients.length > 1 ? 's' : ''}. Usa el botón <strong>Inventario</strong> en cada opción para definir qué descuenta del stock cuando el cajero la elige.
                </p>
              )}
              {form.modifierGroups.length === 0 && (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--color-bg)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.1 4.9A10 10 0 0 0 4.9 19.1M4.9 4.9a10 10 0 0 1 14.2 14.2"/></svg>
                  </div>
                  <p className="text-sm">Sin configuraciones — el producto se agrega directo al carrito.</p>
                </div>
              )}
              {form.modifierGroups.map(group => (
                <ModifierGroupEditor
                  key={group.id}
                  group={group}
                  onChange={g => updateGroup(group.id, g)}
                  onRemove={() => removeGroup(group.id)}
                  inventoryItems={inventoryItems}
                />
              ))}
              <button
                type="button"
                onClick={addModifierGroup}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
              >
                + Agregar grupo de opciones
              </button>

            </div>
          )}

          {/* ── INGREDIENTES ───────────────────────────────── */}
          {tab === 'ingredients' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                Ingredientes usados en este producto. Se usarán para el control de inventario.
              </p>
              <IngredientsEditor
                ingredients={form.ingredients}
                inventoryItems={inventoryItems}
                onChange={ingredients => setForm(f => ({ ...f, ingredients }))}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {error && <p className="px-5 text-xs text-[var(--color-danger)]">{error}</p>}
        <div className="flex gap-2 px-5 py-4 border-t border-[var(--color-border)]">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || form.basePrice <= 0}
            className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? 'Guardando…' : 'Guardar producto'}
          </button>
        </div>
      </div>
    </div>
  )

}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Vainilla', description: '', category: ProductCategory.ICE_CREAM, basePrice: 3500, active: true, imageUrl: null, ingredients: [], modifierGroups: [] },
  { id: 'p2', name: 'Americano', description: '', category: ProductCategory.COFFEE, basePrice: 4000, active: true, imageUrl: null, ingredients: [], modifierGroups: [] },
  { id: 'p3', name: 'Croissant', description: '', category: ProductCategory.PASTRY, basePrice: 3000, active: true, imageUrl: null, ingredients: [], modifierGroups: [] },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Product | 'new' | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<ProductCategory | 'ALL'>('ALL')

  // Category management panel
  const [showCatPanel, setShowCatPanel] = useState(false)
  const [newCat, setNewCat] = useState({ label: '', emoji: '⭐', color: '#6366f1' })
  const [newCatError, setNewCatError] = useState('')
  const { update: updateCat, add: addCat, remove: removeCat, move: moveCat, reset: resetCats } = useCategoryStore()
  const allCats = useSortedCategories(true)

  function handleAddCategory() {
    if (!newCat.label.trim()) { setNewCatError('El nombre es obligatorio'); return }
    const key = `custom_${Date.now()}`
    addCat({ key, label: newCat.label.trim(), emoji: newCat.emoji || '🏷️', color: newCat.color, hidden: false })
    setNewCat({ label: '', emoji: '⭐', color: '#6366f1' })
    setNewCatError('')
  }

  useEffect(() => {
    api.get<{ data: Product[] }>('/api/v1/products?active=all&branchId=default')
      .then(res => setProducts(res.data))
      .catch(() => { if (import.meta.env.DEV) setProducts(MOCK_PRODUCTS) })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(data: Omit<Product, 'id'> & { id?: string }) {
    if (import.meta.env.DEV) {
      const id = data.id ?? crypto.randomUUID()
      const saved: Product = { id, ...data }
      setProducts(prev => data.id ? prev.map(p => p.id === id ? saved : p) : [...prev, saved])
      return
    }
    if (data.id) {
      const res = await api.put<{ data: Product }>(`/api/v1/products/${data.id}`, data)
      setProducts(prev => prev.map(p => p.id === data.id ? res.data : p))
    } else {
      const res = await api.post<{ data: Product }>('/api/v1/products', { ...data, branchId: 'default' })
      setProducts(prev => [...prev, res.data])
    }
  }

  async function handleToggle(p: Product) {
    try { await api.put(`/api/v1/products/${p.id}`, { active: !p.active }) } catch { /* optimistic */ }
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  const filtered = products.filter(p => {
    const matchCat = filterCat === 'ALL' || p.category === filterCat
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) return <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">Cargando…</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Productos</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setShowCatPanel(v => !v); setNewCatError('') }}
            className={[
              'px-3 py-2 rounded-xl border text-sm font-semibold transition-colors',
              showCatPanel
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
            ].join(' ')}
          >
            Categorías
          </button>
          <button
            type="button"
            onClick={() => setModal('new')}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Category management panel */}
      {showCatPanel && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Gestionar categorías</p>
            <button
              type="button"
              onClick={resetCats}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
            >
              Restablecer
            </button>
          </div>

          <div className="space-y-1.5">
            {allCats.map((cat, idx) => {
              const isDefault = CATEGORY_DEFAULTS.some(d => d.key === cat.key)
              return (
                <div key={cat.key} className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                  <input
                    type="text"
                    value={cat.emoji}
                    onChange={e => updateCat(cat.key, { emoji: e.target.value })}
                    className="w-9 text-center text-lg bg-transparent border-none outline-none"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={cat.label}
                    onChange={e => updateCat(cat.key, { label: e.target.value })}
                    className="flex-1 min-w-0 text-sm px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <input
                    type="color"
                    value={cat.color}
                    onChange={e => updateCat(cat.key, { color: e.target.value })}
                    title="Color"
                    className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--color-border)] p-0.5 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => updateCat(cat.key, { hidden: !cat.hidden })}
                    className={[
                      'text-xs px-2 py-1 rounded-lg border transition-colors shrink-0',
                      cat.hidden
                        ? 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                        : 'border-[var(--color-accent)] text-[var(--color-accent)]',
                    ].join(' ')}
                  >
                    {cat.hidden ? 'Oculta' : 'Visible'}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCat(cat.key, 'up')}
                    disabled={idx === 0}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-opacity"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => moveCat(cat.key, 'down')}
                    disabled={idx === allCats.length - 1}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-opacity"
                  >↓</button>
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => removeCat(cat.key)}
                      className="text-[var(--color-danger)] hover:opacity-70 transition-opacity text-xs ml-1"
                    >✕</button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add new category */}
          <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Nueva categoría</p>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={newCat.emoji}
                onChange={e => setNewCat(p => ({ ...p, emoji: e.target.value }))}
                placeholder="⭐"
                maxLength={2}
                className="w-10 text-center text-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)] py-1"
              />
              <input
                type="text"
                value={newCat.label}
                onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="Nombre de categoría"
                className="flex-1 min-w-[160px] text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <input
                type="color"
                value={newCat.color}
                onChange={e => setNewCat(p => ({ ...p, color: e.target.value }))}
                className="w-8 h-8 rounded-lg cursor-pointer border border-[var(--color-border)] p-0.5 bg-transparent"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-white text-xs font-bold hover:opacity-90 transition-opacity"
              >
                + Agregar
              </button>
            </div>
            {newCatError && <p className="text-xs text-[var(--color-danger)]">{newCatError}</p>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value as ProductCategory | 'ALL')}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <option value="ALL">Todas las categorías</option>
          {Object.values(ProductCategory).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {['Nombre', 'Categoría', 'Precio base', 'Opciones', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-muted)] text-sm">
                  Sin productos{search ? ` para "${search}"` : ''}
                </td>
              </tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb name={p.name} category={p.category} imageUrl={p.imageUrl} size={36} />
                    <span className="font-medium text-[var(--color-text-primary)]">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{CATEGORY_LABELS[p.category as import('@shared-types').ProductCategory] ?? p.category}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatCurrency(p.basePrice)}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                  {p.modifierGroups.length > 0
                    ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.modifierGroups.length} grupo{p.modifierGroups.length > 1 ? 's' : ''}</span>
                    : <span className="text-xs text-[var(--color-text-muted)]">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(p)}
                    className={['px-2 py-0.5 rounded-full text-xs font-semibold', p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'].join(' ')}
                  >
                    {p.active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setModal(p)} className="text-xs text-[var(--color-accent)] hover:underline">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ProductModal
          product={modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
