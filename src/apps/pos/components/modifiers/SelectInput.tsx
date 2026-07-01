import { formatCurrency } from '@/shared/lib/currency'
import type { ModifierOptionConfig } from '@shared-types'

interface SelectInputProps {
  options: ModifierOptionConfig[]
  selected: string[]
  multiple: boolean
  minSelections?: number | null
  showDescription?: boolean
  onChange: (selected: string[]) => void
}

export function SelectInput({ options, selected, multiple, minSelections, showDescription, onChange }: SelectInputProps) {
  function toggle(optionId: string) {
    if (multiple) {
      if (selected.includes(optionId)) {
        const next = selected.filter(id => id !== optionId)
        if (next.length < (minSelections ?? 0)) return
        onChange(next)
      } else {
        onChange([...selected, optionId])
      }
    } else {
      onChange([optionId])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            aria-pressed={isSelected}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors text-left',
              isSelected
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]',
            ].join(' ')}
          >
            <span>{opt.name}</span>
            {opt.priceDelta !== 0 && (
              <span className="ml-1 text-xs opacity-75">
                {opt.priceDelta > 0 ? '+' : ''}{formatCurrency(opt.priceDelta)}
              </span>
            )}
            {showDescription && opt.description && (
              <span className="block text-xs opacity-70 font-normal">{opt.description}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
