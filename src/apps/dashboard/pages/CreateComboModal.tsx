import { useState, useMemo } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { ProductCategory } from '@shared-types'

interface Product {
  id: string
  name: string
  category: ProductCategory | string
  basePrice: number
  active: boolean
}

interface ComboComponent {
  productId: string
  name: string
  basePrice: number
  quantity: number
}

interface Props {
  products: Product[]
  branchId: string
  onClose: () => void
  onCreated: () => void
}

export function CreateComboModal({ products, branchId, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [priceText, setPriceText] = useState('')
  const [components, setComponents] = useState<ComboComponent[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const eligibleProducts = useMemo(
    () => products.filter(p => p.active && p.category !== ProductCategory.COMBO),
    [products]
  )

  const filteredProducts = useMemo(
    () => search
      ? eligibleProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : eligibleProducts,
    [eligibleProducts, search]
  )

  const isSelected = (id: string) => components.some(c => c.productId === id)

  function toggleProduct(p: Product) {
    if (isSelected(p.id)) {
      setComponents(prev => prev.filter(c => c.productId !== p.id))
    } else {
      setComponents(prev => [...prev, { productId: p.id, name: p.name, basePrice: p.basePrice, quantity: 1 }])
    }
  }

  function updateQty(productId: string, delta: number) {
    setComponents(prev => prev.map(c => {
      if (c.productId !== productId) return c
      const next = c.quantity + delta
      return next < 1 ? c : { ...c, quantity: next }
    }))
  }

  const priceInCents = useMemo(() => {
    const parsed = parseFloat(priceText.replace(',', '.'))
    return isNaN(parsed) ? 0 : Math.round(parsed * 100)
  }, [priceText])

  const suggestedPrice = useMemo(
    () => components.reduce((sum, c) => sum + c.basePrice * c.quantity, 0),
    [components]
  )

  const canSave = name.trim().length > 0 && priceInCents > 0 && components.length >= 2

  async function handleSave() {
    if (!canSave || saving) return
    setError('')
    setSaving(true)
    try {
      await api.post('/api/v1/products/combo', {
        branchId,
        name: name.trim(),
        basePrice: priceInCents,
        components: components.map(c => ({ productId: c.productId, quantity: c.quantity })),
      })
      onCreated()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el combo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">Crear combo</h2>
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
              placeholder="Ej. Combo Helado + Café"
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
          </div>

          {/* Componentes seleccionados */}
          {components.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                Productos incluidos ({components.length})
              </p>
              <div className="space-y-1.5">
                {components.map(c => (
                  <div key={c.productId} className="flex items-center gap-3 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">{c.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(c.productId, -1)}
                        className="w-6 h-6 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] transition-colors"
                      >−</button>
                      <span className="text-sm font-bold text-[var(--color-text-primary)] w-4 text-center">{c.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.productId, 1)}
                        className="w-6 h-6 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] transition-colors"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selector de productos */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Agregar productos al combo
            </p>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors mb-2"
            />
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {filteredProducts.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] py-3 text-center">Sin productos</p>
              )}
              {filteredProducts.map(p => {
                const selected = isSelected(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p)}
                    className={[
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors border',
                      selected
                        ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30'
                        : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-accent)]/40',
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

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-2">
          {components.length < 2 && (
            <p className="text-xs text-center text-[var(--color-text-muted)]">Selecciona al menos 2 productos</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando…' : `Crear combo${priceInCents > 0 ? ` · ${formatCurrency(priceInCents)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
