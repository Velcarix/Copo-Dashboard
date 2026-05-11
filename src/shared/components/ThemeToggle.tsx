import { useThemeStore } from '@/shared/store/themeStore'

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${theme === 'light' ? 'noche' : 'día'}`}
      className="flex items-center gap-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full p-0.5"
    >
      {(['light','dark'] as const).map(t => (
        <span
          key={t}
          className={[
            'rounded-full px-2 py-1 text-xs transition-all',
            theme === t
              ? 'bg-[var(--color-accent)] text-white font-bold shadow-sm'
              : 'text-[var(--color-text-muted)]',
          ].join(' ')}
        >
          {t === 'light' ? '☀️' : '🌙'}
        </span>
      ))}
    </button>
  )
}
