const PAGE_SIZE = 20

interface Column {
  key: string
  label: string
}

interface ReportTableProps {
  columns: Column[]
  data: Record<string, string | number>[]
  total: number
  page: number
  onPageChange: (page: number) => void
}

export function ReportTable({ columns, data, total, page, onPageChange }: ReportTableProps) {
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--color-text-muted)] text-sm">
                  Sin datos
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-[var(--color-text-primary)]">
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            Página {page} de {totalPages} — {total} registros
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="página anterior"
              className="px-3 py-1 rounded-lg text-xs border border-[var(--color-border)] disabled:opacity-40 hover:border-[var(--color-accent)] transition-colors"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="siguiente página"
              className="px-3 py-1 rounded-lg text-xs border border-[var(--color-border)] disabled:opacity-40 hover:border-[var(--color-accent)] transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
