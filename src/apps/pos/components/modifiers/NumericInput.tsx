interface NumericInputProps {
  value: number
  min?: number
  max?: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}

export function NumericInput({ value, min = 1, max = 99, step = 1, unit, onChange }: NumericInputProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => { if (value - step >= min) onChange(value - step) }}
        aria-label="menos"
        disabled={value <= min}
        className="w-10 h-10 rounded-full border border-[var(--color-border)] text-xl font-bold disabled:opacity-40 transition-opacity"
      >
        −
      </button>
      <span className="min-w-[3rem] text-center text-lg font-bold text-[var(--color-text-primary)]">
        {value}{unit ? ` ${unit}` : ''}
      </span>
      <button
        type="button"
        onClick={() => { if (value + step <= max) onChange(value + step) }}
        aria-label="más"
        disabled={value >= max}
        className="w-10 h-10 rounded-full border border-[var(--color-border)] text-xl font-bold disabled:opacity-40 transition-opacity"
      >
        +
      </button>
    </div>
  )
}
