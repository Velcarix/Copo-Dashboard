import { useMemo, useState } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { ProductCategory, PricingMode, ComboSlotSource } from '@shared-types'
import type { ProductVariant, ComboSlot } from '@shared-types'
import { useSortedCategories, type CategoryMeta } from '@/shared/store/categoryStore'

interface Product {
  id: string
  name: string
  category: ProductCategory | string
  basePrice: number
  active: boolean
  variants?: ProductVariant[]
  maxFlavors?: number
}

/** Combo existente tal como lo sirve `GET /api/v1/products/:id` (doc 03 §1). */
export interface ComboToEdit {
  id: string
  name: string
  basePrice: number
  comboSlots: ComboSlot[]
}

interface DraftSlotOption {
  productId: string
  name: string
  priceDelta: number
}

interface DraftSlot {
  key: string // id local del editor (no viaja al backend)
  name: string
  quantity: number
  source: ComboSlotSource
  categoryId?: string
  options: DraftSlotOption[]
}

interface Props {
  products: Product[]
  branchId: string
  combo?: ComboToEdit
  onClose: () => void
  onCreated: () => void
}

function uid() { return crypto.randomUUID() }

function draftSlotsFromCombo(combo: ComboToEdit, products: Product[]): DraftSlot[] {
  return combo.comboSlots.map(s => ({
    key: uid(),
    name: s.name,
    quantity: s.quantity,
    source: s.source,
    categoryId: s.categoryId,
    options: s.options.map(o => ({
      productId: o.productId,
      name: o.name ?? products.find(p => p.id === o.productId)?.name ?? o.productId,
      priceDelta: o.priceDelta,
    })),
  }))
}

function pricingModeChipLabel(mode: PricingMode): string {
  if (mode === PricingMode.VARIANTS) return 'por tamaño'
  if (mode === PricingMode.PRESENTATION) return 'por presentación'
  return 'precio único'
}

function slotIsValid(s: DraftSlot): boolean {
  if (!s.name.trim() || s.quantity < 1) return false
  return s.source === ComboSlotSource.CATEGORY ? !!s.categoryId : s.options.length >= 1
}

function slotReferencePrice(s: DraftSlot, eligibleProducts: Product[]): number {
  const candidates = s.source === ComboSlotSource.SPECIFIC_PRODUCTS
    ? s.options.map(o => eligibleProducts.find(p => p.id === o.productId)?.basePrice ?? 0)
    : eligibleProducts.filter(p => p.category === s.categoryId).map(p => p.basePrice)
  return candidates.length ? Math.min(...candidates) : 0
}

// Pasos que verá el cajero al llenar este slot — usado solo por el preview,
// se arma en seco con el estado local, sin llamar al backend.
function slotPreviewLine(s: DraftSlot, eligibleProducts: Product[], allCats: CategoryMeta[]): string {
  const modes = new Set<PricingMode>()
  if (s.source === ComboSlotSource.CATEGORY) {
    modes.add(allCats.find(c => c.key === s.categoryId)?.pricingMode ?? PricingMode.FIXED)
  } else {
    for (const o of s.options) {
      const product = eligibleProducts.find(p => p.id === o.productId)
      const mode = allCats.find(c => c.key === product?.category)?.pricingMode ?? PricingMode.FIXED
      modes.add(mode)
    }
  }
  const parts: string[] = []
  if (modes.has(PricingMode.PRESENTATION)) parts.push('elige presentación → sabores')
  if (modes.has(PricingMode.VARIANTS)) parts.push('elige tamaño')
  if (modes.has(PricingMode.FIXED) || modes.size === 0) parts.push('elige producto')
  return parts.join(' · ')
}

export function CreateComboModal({ products, branchId, combo, onClose, onCreated }: Props) {
  const isEditing = !!combo
  const [name, setName] = useState(combo?.name ?? '')
  const [priceText, setPriceText] = useState(combo ? (combo.basePrice / 100).toFixed(2) : '')
  const [slots, setSlots] = useState<DraftSlot[]>(() => combo ? draftSlotsFromCombo(combo, products) : [])
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const allCats = useSortedCategories(true)

  // Solo se excluyen productos COMBO (no se anidan combos). VARIANTS y PRESENTATION
  // ya son elegibles — antes se excluía VARIANTS porque no había forma de capturar
  // la variante elegida por unidad; combos v2 sí la captura (ver doc 04 §4).
  const eligibleProducts = useMemo(
    () => products.filter(p => p.active && p.category !== ProductCategory.COMBO),
    [products]
  )

  function addSlot() {
    setSlots(prev => [...prev, { key: uid(), name: '', quantity: 1, source: ComboSlotSource.SPECIFIC_PRODUCTS, options: [] }])
  }
  function removeSlot(key: string) {
    setSlots(prev => prev.filter(s => s.key !== key))
  }
  function updateSlot(key: string, patch: Partial<DraftSlot>) {
    setSlots(prev => prev.map(s => (s.key === key ? { ...s, ...patch } : s)))
  }
  function toggleSlotOption(slotKey: string, p: Product) {
    setSlots(prev => prev.map(s => {
      if (s.key !== slotKey) return s
      const exists = s.options.some(o => o.productId === p.id)
      return exists
        ? { ...s, options: s.options.filter(o => o.productId !== p.id) }
        : { ...s, options: [...s.options, { productId: p.id, name: p.name, priceDelta: 0 }] }
    }))
  }
  function updateOptionDelta(slotKey: string, productId: string, deltaText: string) {
    const parsed = parseFloat(deltaText.replace(',', '.'))
    const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100)
    setSlots(prev => prev.map(s => (s.key !== slotKey ? s : {
      ...s,
      options: s.options.map(o => (o.productId === productId ? { ...o, priceDelta: cents } : o)),
    })))
  }

  const priceInCents = useMemo(() => {
    const parsed = parseFloat(priceText.replace(',', '.'))
    return isNaN(parsed) ? 0 : Math.round(parsed * 100)
  }, [priceText])

  const suggestedPrice = useMemo(
    () => slots.reduce((sum, s) => sum + slotReferencePrice(s, eligibleProducts) * s.quantity, 0),
    [slots, eligibleProducts]
  )

  const totalUnits = useMemo(() => slots.reduce((sum, s) => sum + s.quantity, 0), [slots])

  const canSave = name.trim().length > 0
    && priceInCents > 0
    && slots.length >= 1
    && totalUnits >= 2
    && slots.every(slotIsValid)

  async function handleSave() {
    if (!canSave || saving) return
    setError('')
    setSaving(true)
    try {
      const payload = {
        branchId,
        name: name.trim(),
        basePrice: priceInCents,
        slots: slots.map(s => ({
          name: s.name.trim(),
          quantity: s.quantity,
          source: s.source,
          categoryId: s.source === ComboSlotSource.CATEGORY ? s.categoryId : undefined,
          options: s.source === ComboSlotSource.SPECIFIC_PRODUCTS
            ? s.options.map(o => ({ productId: o.productId, priceDelta: o.priceDelta }))
            : [],
        })),
      }
      if (isEditing && combo) {
        await api.put(`/api/v1/products/combo/${combo.id}`, payload)
      } else {
        await api.post('/api/v1/products/combo', payload)
      }
      onCreated()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el combo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">{isEditing ? 'Editar combo' : 'Crear combo'}</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
              Nombre del combo
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. 3 Helados 3x2"
              className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
              Precio del combo (pesos)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={priceText}
                  onChange={e => setPriceText(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-[var(--color-border)] rounded-xl pl-7 pr-4 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
                />
              </div>
              {suggestedPrice > 0 && (
                <button
                  type="button"
                  onClick={() => setPriceText((suggestedPrice / 100).toFixed(2))}
                  className="shrink-0 text-xs text-[var(--color-accent)] border border-[var(--color-accent)] rounded-xl px-3 py-2.5 hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  Sugerido: {formatCurrency(suggestedPrice)}
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              El precio del combo es fijo. Elegir cono, vaso o litro no cambia el precio salvo
              que agregues un &quot;+$&quot; a una opción del slot.
            </p>
          </div>

          {/* Slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                Ranuras del combo ({slots.length})
              </p>
              <button
                type="button"
                onClick={addSlot}
                className="text-xs font-semibold text-[var(--color-accent)] border border-[var(--color-accent)] rounded-lg px-2.5 py-1 hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              >
                ＋ Agregar slot
              </button>
            </div>

            {slots.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-4 border border-dashed border-[var(--color-border)] rounded-xl">
                Agrega al menos un slot — ej. &quot;Elige tu helado&quot; con cantidad 3.
              </p>
            )}

            <div className="space-y-3">
              {slots.map(slot => (
                <SlotCard
                  key={slot.key}
                  slot={slot}
                  allCats={allCats}
                  eligibleProducts={eligibleProducts}
                  onUpdate={patch => updateSlot(slot.key, patch)}
                  onRemove={() => removeSlot(slot.key)}
                  onToggleOption={p => toggleSlotOption(slot.key, p)}
                  onUpdateOptionDelta={(productId, text) => updateOptionDelta(slot.key, productId, text)}
                />
              ))}
            </div>
          </div>

          {/* Preview del cajero */}
          {slots.length > 0 && (
            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
              >
                <span>👀 Vista previa del cajero</span>
                <span>{showPreview ? '▲' : '▼'}</span>
              </button>
              {showPreview && (
                <div className="px-4 py-3 border-t border-[var(--color-border)] space-y-2 bg-[var(--color-bg)]">
                  {slots.map((s, i) => (
                    <p key={s.key} className="text-xs text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        Paso {i + 1} · {s.name.trim() || '(sin nombre)'} ({s.quantity} {s.quantity === 1 ? 'unidad' : 'unidades'})
                      </span>
                      {' — '}
                      {slotIsValid(s) ? slotPreviewLine(s, eligibleProducts, allCats) : 'incompleto'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-2">
          {slots.length === 0 && (
            <p className="text-xs text-center text-[var(--color-text-muted)]">Agrega al menos 1 slot</p>
          )}
          {slots.length > 0 && totalUnits < 2 && (
            <p className="text-xs text-center text-[var(--color-text-muted)]">El combo debe sumar al menos 2 unidades</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? 'Guardando…'
              : `${isEditing ? 'Guardar cambios' : 'Crear combo'}${priceInCents > 0 ? ` · ${formatCurrency(priceInCents)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function SlotCard({
  slot,
  allCats,
  eligibleProducts,
  onUpdate,
  onRemove,
  onToggleOption,
  onUpdateOptionDelta,
}: {
  slot: DraftSlot
  allCats: CategoryMeta[]
  eligibleProducts: Product[]
  onUpdate: (patch: Partial<DraftSlot>) => void
  onRemove: () => void
  onToggleOption: (p: Product) => void
  onUpdateOptionDelta: (productId: string, text: string) => void
}) {
  const [search, setSearch] = useState('')

  const filteredProducts = useMemo(
    () => search
      ? eligibleProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : eligibleProducts,
    [eligibleProducts, search]
  )

  const selectedCategory = allCats.find(c => c.key === slot.categoryId)
  const categoryProductCount = slot.categoryId
    ? eligibleProducts.filter(p => p.category === slot.categoryId).length
    : 0

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-3 space-y-3 bg-[var(--color-bg)]">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={slot.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder='Nombre del slot — ej. "Elige tu helado"'
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              Cantidad
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdate({ quantity: Math.max(1, slot.quantity - 1) })}
                  className="w-6 h-6 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-xs hover:border-[var(--color-accent)] transition-colors"
                >−</button>
                <span className="w-4 text-center font-bold text-[var(--color-text-primary)]">{slot.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdate({ quantity: Math.min(20, slot.quantity + 1) })}
                  className="w-6 h-6 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-xs hover:border-[var(--color-accent)] transition-colors"
                >+</button>
              </div>
            </label>

            <div className="flex items-center gap-1 bg-white border border-[var(--color-border)] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onUpdate({ source: ComboSlotSource.CATEGORY })}
                className={['px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                  slot.source === ComboSlotSource.CATEGORY ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)]'
                ].join(' ')}
              >Categoría</button>
              <button
                type="button"
                onClick={() => onUpdate({ source: ComboSlotSource.SPECIFIC_PRODUCTS })}
                className={['px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                  slot.source === ComboSlotSource.SPECIFIC_PRODUCTS ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)]'
                ].join(' ')}
              >Productos específicos</button>
            </div>
          </div>
        </div>
        <button type="button" onClick={onRemove} className="text-xs text-[var(--color-danger)] hover:underline shrink-0 mt-1">
          Eliminar
        </button>
      </div>

      {slot.source === ComboSlotSource.CATEGORY ? (
        <div>
          <select
            value={slot.categoryId ?? ''}
            onChange={e => onUpdate({ categoryId: e.target.value || undefined })}
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
          >
            <option value="">Selecciona una categoría…</option>
            {allCats.map(c => (
              <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
            ))}
          </select>
          {selectedCategory && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded-full font-semibold mr-1.5">
                {pricingModeChipLabel(selectedCategory.pricingMode)}
              </span>
              {categoryProductCount} producto{categoryProductCount === 1 ? '' : 's'} activo{categoryProductCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
      ) : (
        <div>
          {slot.options.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {slot.options.map(o => (
                <div key={o.productId} className="flex items-center gap-2 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-lg px-3 py-1.5">
                  <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{o.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">+$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={o.priceDelta > 0 ? (o.priceDelta / 100).toFixed(2) : ''}
                    onChange={e => onUpdateOptionDelta(o.productId, e.target.value)}
                    placeholder="0.00"
                    className="w-20 border border-[var(--color-border)] rounded-md px-2 py-1 text-xs bg-white text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors mb-1.5"
          />
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {filteredProducts.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] py-2 text-center">Sin productos</p>
            )}
            {filteredProducts.map(p => {
              const selected = slot.options.some(o => o.productId === p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggleOption(p)}
                  className={['w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors border',
                    selected
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]/40',
                  ].join(' ')}
                >
                  <span className={['w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px] font-bold',
                    selected ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'border-[var(--color-border)]'
                  ].join(' ')}>
                    {selected ? '✓' : ''}
                  </span>
                  <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{p.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0">{p.category}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] shrink-0">{formatCurrency(p.basePrice)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
