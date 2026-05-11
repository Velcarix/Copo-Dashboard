interface NumericKeypadProps {
  value: string
  onChange: (v: string) => void
  maxDigits?: number
  showDecimal?: boolean
}

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'] as const

export function NumericKeypad({ value, onChange, maxDigits, showDecimal = false }: NumericKeypadProps) {
  function handleKey(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (!key) return
    if (maxDigits && value.replace('.','').length >= maxDigits) return
    if (key === '.' && (!showDecimal || value.includes('.'))) return
    onChange(value + key)
  }

  const keys = showDecimal ? ['1','2','3','4','5','6','7','8','9','.','0','⌫'] : KEYS

  return (
    <div className="grid grid-cols-3 gap-2 select-none">
      {keys.map((key, i) =>
        key ? (
          <button
            key={`${i}-${key}`}
            onClick={() => handleKey(key as string)}
            aria-label={key === '⌫' ? 'borrar' : undefined}
            className="h-16 rounded-xl text-xl font-bold transition-all active:scale-95 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
          >
            {key}
          </button>
        ) : (
          <div key={`${i}-empty`} />
        )
      )}
    </div>
  )
}
