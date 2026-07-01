import { useState, useEffect } from 'react'
import { ModifierInputType } from '@shared-types'
import type { CartItemModifier, ModifierGroupConfig } from '@shared-types'
import { formatCurrency } from '@/shared/lib/currency'
import type { ProductWithModifiers } from '@/shared/store/posStore'
import { SelectInput } from './SelectInput'
import { NumericInput } from './NumericInput'
import { WeightInput } from './WeightInput'

type GroupSel = { optionIds: string[]; value: number }
type Selections = Record<string, GroupSel>

function defaultSelections(groups: ModifierGroupConfig[]): Selections {
  const sel: Selections = {}
  for (const g of groups) {
    if (g.inputType === ModifierInputType.SELECT || g.inputType === ModifierInputType.SIZE) {
      const defaults = g.options.filter(o => o.isDefault).map(o => o.id)
      sel[g.id] = { optionIds: defaults, value: 0 }
    } else if (g.inputType === ModifierInputType.NUMERIC) {
      sel[g.id] = { optionIds: [], value: g.minValue ?? 1 }
    } else if (g.inputType === ModifierInputType.WEIGHT) {
      sel[g.id] = { optionIds: [], value: g.weightPresets?.[0] ?? g.minValue ?? 50 }
    }
  }
  return sel
}

function selectionsFromInitial(groups: ModifierGroupConfig[], initial: CartItemModifier[]): Selections {
  const sel = defaultSelections(groups)
  for (const g of groups) {
    const groupMods = initial.filter(m => {
      if (g.inputType === ModifierInputType.SELECT || g.inputType === ModifierInputType.SIZE) {
        return g.options.some(o => o.id === m.optionId)
      }
      return m.optionId.startsWith(g.id + ':')
    })
    if (groupMods.length === 0) continue

    if (g.inputType === ModifierInputType.SELECT || g.inputType === ModifierInputType.SIZE) {
      const optionIds = groupMods.map(m => m.optionId)
      sel[g.id] = { optionIds, value: 0 }
    } else if (g.inputType === ModifierInputType.NUMERIC) {
      const val = parseInt(groupMods[0].optionName, 10)
      sel[g.id] = { optionIds: [], value: isNaN(val) ? (g.minValue ?? 1) : val }
    } else if (g.inputType === ModifierInputType.WEIGHT) {
      const val = parseInt(groupMods[0].optionName, 10)
      sel[g.id] = { optionIds: [], value: isNaN(val) ? (g.weightPresets?.[0] ?? g.minValue ?? 50) : val }
    }
  }
  return sel
}

function isConfirmEnabled(groups: ModifierGroupConfig[], sel: Selections): boolean {
  return groups.every(g => {
    const s = sel[g.id]
    if (!s) return !g.required
    if (g.inputType === ModifierInputType.SELECT || g.inputType === ModifierInputType.SIZE) {
      const min = g.minSelections ?? (g.required ? 1 : 0)
      const max = g.maxSelections ?? Infinity
      return s.optionIds.length >= min && s.optionIds.length <= max
    }
    return true
  })
}

function buildModifiers(groups: ModifierGroupConfig[], sel: Selections): CartItemModifier[] {
  const result: CartItemModifier[] = []
  for (const g of groups) {
    const s = sel[g.id]
    if (!s) continue
    if (g.inputType === ModifierInputType.SELECT || g.inputType === ModifierInputType.SIZE) {
      for (const optId of s.optionIds) {
        const opt = g.options.find(o => o.id === optId)
        if (opt) result.push({ optionId: opt.id, optionName: opt.name, priceDelta: opt.priceDelta })
      }
    } else if (g.inputType === ModifierInputType.NUMERIC) {
      const price = Math.round((g.pricePerUnit ?? 0) * s.value)
      result.push({ optionId: `${g.id}:numeric`, optionName: `${s.value} ${g.unit ?? ''}`.trim(), priceDelta: price })
    } else if (g.inputType === ModifierInputType.WEIGHT) {
      const price = Math.round((g.pricePerUnit ?? 0) * s.value)
      result.push({ optionId: `${g.id}:weight`, optionName: `${s.value}${g.unit ?? 'g'}`, priceDelta: price })
    }
  }
  return result
}

function computeExtraPrice(groups: ModifierGroupConfig[], sel: Selections): number {
  return buildModifiers(groups, sel).reduce((sum, m) => sum + m.priceDelta, 0)
}

interface ModifierSheetProps {
  product: ProductWithModifiers | null
  initialValues?: CartItemModifier[]
  onConfirm: (modifiers: CartItemModifier[], note: string | undefined) => void
  onClose: () => void
}

export function ModifierSheet({ product, initialValues, onConfirm, onClose }: ModifierSheetProps) {
  const [selections, setSelections] = useState<Selections>({})
  const [note, setNote] = useState('')

  useEffect(() => {
    if (product) {
      setSelections(
        initialValues && initialValues.length > 0
          ? selectionsFromInitial(product.modifierGroups, initialValues)
          : defaultSelections(product.modifierGroups)
      )
      setNote('')
    }
  }, [product, initialValues])

  if (!product) return null

  const groups = product.modifierGroups
  const canConfirm = isConfirmEnabled(groups, selections)
  const extra = computeExtraPrice(groups, selections)
  const total = product.basePrice + extra

  function handleConfirm() {
    const mods = buildModifiers(groups, selections)
    onConfirm(mods, note.trim() || undefined)
  }

  function updateSel(groupId: string, patch: Partial<GroupSel>) {
    setSelections(prev => ({ ...prev, [groupId]: { ...prev[groupId], ...patch } }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text-primary)]">{product.name}</h2>
          <button type="button" onClick={onClose} aria-label="cerrar" className="text-[var(--color-text-muted)] text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">
          {groups.map(group => (
            <div key={group.id}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{group.name}</span>
                {group.required && (
                  <span className="text-[10px] text-[var(--color-danger)] font-bold uppercase">Requerido</span>
                )}
              </div>
              {(group.inputType === ModifierInputType.SELECT || group.inputType === ModifierInputType.SIZE) && (
                <SelectInput
                  options={group.options}
                  selected={selections[group.id]?.optionIds ?? []}
                  multiple={group.multiple}
                  minSelections={group.minSelections}
                  showDescription={group.inputType === ModifierInputType.SIZE}
                  onChange={optionIds => updateSel(group.id, { optionIds })}
                />
              )}
              {group.inputType === ModifierInputType.NUMERIC && (
                <NumericInput
                  value={selections[group.id]?.value ?? (group.minValue ?? 1)}
                  min={group.minValue}
                  max={group.maxValue}
                  step={group.step}
                  unit={group.unit}
                  onChange={value => updateSel(group.id, { value })}
                />
              )}
              {group.inputType === ModifierInputType.WEIGHT && (
                <WeightInput
                  value={selections[group.id]?.value ?? (group.weightPresets?.[0] ?? group.minValue ?? 50)}
                  min={group.minValue}
                  max={group.maxValue}
                  step={group.step}
                  unit={group.unit}
                  presets={group.weightPresets}
                  onChange={value => updateSel(group.id, { value })}
                />
              )}
            </div>
          ))}

          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Nota (opcional)</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={100}
              placeholder="Ej: sin azúcar"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-3.5 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm disabled:opacity-40 transition-opacity"
          >
            Agregar al carrito — {formatCurrency(total)}
          </button>
        </div>
      </div>
    </div>
  )
}
