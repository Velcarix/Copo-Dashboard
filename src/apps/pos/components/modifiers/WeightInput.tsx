import { NumericInput } from './NumericInput'

interface WeightInputProps {
  value: number
  min?: number
  max?: number
  step?: number
  unit?: string
  presets?: number[]
  onChange: (v: number) => void
}

export function WeightInput({ value, min = 50, max = 1000, step = 25, unit = 'g', presets, onChange }: WeightInputProps) {
  return (
    <div className="space-y-3">
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-pressed={value === preset}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                value === preset
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
              ].join(' ')}
            >
              {preset} {unit}
            </button>
          ))}
        </div>
      )}
      <NumericInput value={value} min={min} max={max} step={step} unit={unit} onChange={onChange} />
    </div>
  )
}
