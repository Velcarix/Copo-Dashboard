import { useRef, useState, useEffect } from 'react'
import { useBranchStore } from '@/shared/store/branchStore'

// One dot color per branch index (cycles if > 5)
const BRANCH_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899']

function BranchDot({ index, size = 8 }: { index: number; size?: number }) {
  return (
    <span
      className="rounded-full shrink-0 inline-block"
      style={{ width: size, height: size, background: BRANCH_COLORS[index % BRANCH_COLORS.length] }}
    />
  )
}

export function BranchSelector() {
  const { branches, selectedId, setSelected } = useBranchStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selectedBranch = branches.find(b => b.id === selectedId) ?? null
  const selectedIndex = selectedBranch ? branches.indexOf(selectedBranch) : -1

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors w-full',
          'border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-border)]',
          'text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {selectedId === 'ALL' ? (
          <>
            <span className="flex gap-0.5">
              {branches.slice(0, 3).map((_, i) => <BranchDot key={i} index={i} size={6} />)}
            </span>
            <span className="flex-1 text-left truncate">Todas las sucursales</span>
          </>
        ) : (
          <>
            <BranchDot index={selectedIndex} size={8} />
            <span className="flex-1 text-left truncate">{selectedBranch?.name}</span>
          </>
        )}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden">
          {/* Global option */}
          <button
            type="button"
            onClick={() => { setSelected('ALL'); setOpen(false) }}
            className={[
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors text-left',
              selectedId === 'ALL'
                ? 'bg-[var(--color-accent)] text-white'
                : 'hover:bg-[var(--color-bg)] text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            <span className="flex gap-0.5">
              {branches.slice(0, 3).map((_, i) => (
                <BranchDot key={i} index={i} size={6} />
              ))}
            </span>
            <div>
              <p className="font-semibold">Todas las sucursales</p>
              <p className={`text-[10px] ${selectedId === 'ALL' ? 'opacity-75' : 'text-[var(--color-text-muted)]'}`}>
                Vista global consolidada
              </p>
            </div>
          </button>

          <div className="border-t border-[var(--color-border)]" />

          {/* Per-branch options */}
          {branches.map((branch, idx) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => { setSelected(branch.id); setOpen(false) }}
              className={[
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors text-left',
                selectedId === branch.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'hover:bg-[var(--color-bg)] text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              <BranchDot index={idx} size={8} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{branch.name}</p>
                <p className={`text-[10px] truncate ${selectedId === branch.id ? 'opacity-75' : 'text-[var(--color-text-muted)]'}`}>
                  {branch.city}{branch.address ? ` · ${branch.address}` : ''}
                </p>
              </div>
              {!branch.isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">inactiva</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Compact badge shown inside page headers to reinforce which branch is being viewed.
 * Only renders when a specific branch (not ALL) is selected.
 */
export function BranchBadge() {
  const { branches, selectedId } = useBranchStore()
  if (selectedId === 'ALL') return null
  const branch = branches.find(b => b.id === selectedId)
  const idx = branch ? branches.indexOf(branch) : 0
  if (!branch) return null

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
      <BranchDot index={idx} size={6} />
      {branch.name}
    </span>
  )
}
