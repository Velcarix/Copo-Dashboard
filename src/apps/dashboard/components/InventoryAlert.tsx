import { Link } from 'react-router-dom'

interface LowStockItem {
  name: string
  currentStock: number
  minStock: number
  /** Solo viene en la vista "Todas las sucursales". */
  branchName?: string
}

interface InventoryAlertProps {
  items: LowStockItem[]
}

export function InventoryAlert({ items }: InventoryAlertProps) {
  if (items.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--color-warning)] uppercase tracking-wide mb-2">
        ⚠ Stock bajo ({items.length})
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {items.map(item => (
          <Link
            key={`${item.branchName ?? ''}-${item.name}`}
            to="/dashboard/inventory"
            className="bg-[var(--color-surface)] border border-[var(--color-warning)] rounded-xl p-3 hover:border-[var(--color-accent)] transition-colors"
          >
            <p className="font-semibold text-sm text-[var(--color-text-primary)]">{item.name}</p>
            {item.branchName && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{item.branchName}</p>
            )}
            <p className="text-xs text-[var(--color-danger)] mt-0.5">
              {item.currentStock} / {item.minStock} (mínimo)
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
