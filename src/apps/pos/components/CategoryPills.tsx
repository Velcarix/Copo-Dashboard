import { useEffect } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import { useCategoryStore, useSortedCategories } from '@/shared/store/categoryStore'

interface CategoryPillsProps {
  active: string
  onChange: (cat: string) => void
}

export function CategoryPills({ active, onChange }: CategoryPillsProps) {
  const branchId = useAuthStore(s => s.branchId)
  const storeBranchId = useCategoryStore(s => s.branchId)
  const load = useCategoryStore(s => s.load)
  const categories = useSortedCategories()

  useEffect(() => {
    if (branchId && branchId !== storeBranchId) load(branchId)
  }, [branchId, storeBranchId, load])

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-1 py-1">
      <button
        onClick={() => onChange('ALL')}
        aria-pressed={active === 'ALL'}
        className={[
          'shrink-0 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap',
          'transition-all duration-150 active:scale-95',
          active === 'ALL'
            ? 'bg-[var(--color-accent)] text-white shadow-sm'
            : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
      >
        Todos
      </button>

      {categories.map(cat => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          aria-pressed={active === cat.key}
          className={[
            'shrink-0 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap',
            'transition-all duration-150 active:scale-95',
            active === cat.key
              ? 'bg-[var(--color-accent)] text-white shadow-sm'
              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
          ].join(' ')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
        >
          {cat.emoji} {cat.label}
        </button>
      ))}
    </div>
  )
}
