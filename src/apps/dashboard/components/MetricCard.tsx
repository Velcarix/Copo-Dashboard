interface Trend {
  value: number
  positive: boolean
}

interface MetricCardProps {
  label: string
  value: string
  trend?: Trend
  subtitle?: string
}

export function MetricCard({ label, value, trend, subtitle }: MetricCardProps) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{value}</p>
      {trend && (
        <p className={[
          'text-xs font-semibold mt-1',
          trend.positive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]',
        ].join(' ')}>
          {trend.positive ? '↑' : '↓'} {trend.value}% vs ayer
        </p>
      )}
      {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtitle}</p>}
    </div>
  )
}
