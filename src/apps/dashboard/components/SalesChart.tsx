import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/shared/lib/currency'

interface SalesDataPoint {
  hour?: number
  day?: string
  total: number
  count: number
}

interface SalesChartProps {
  data: SalesDataPoint[]
  groupBy: 'hour' | 'day'
  /** Overrides the default "Ventas por día/hora" heading */
  title?: string
  /** Any CSS color; defaults to the theme accent */
  color?: string
  height?: number
  /** Extra line under the title — e.g. total del período de esa sucursal */
  subtitle?: string
}

function formatXAxis(value: number | string, groupBy: 'hour' | 'day'): string {
  if (groupBy === 'hour' && typeof value === 'number') {
    const h = value % 12 || 12
    return `${h}${value < 12 ? 'am' : 'pm'}`
  }
  return String(value)
}

export function SalesChart({
  data,
  groupBy,
  title,
  color = 'var(--color-accent)',
  height = 200,
  subtitle,
}: SalesChartProps) {
  const xKey = groupBy === 'hour' ? 'hour' : 'day'
  // Varios charts conviven en la misma página (uno por sucursal) y un id de
  // gradiente fijo haría que todos pintaran con el del primero que monta.
  const gradientId = `salesGradient-${useId().replace(/:/g, '')}`

  return (
    <div data-testid="sales-chart" className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide truncate">
          {title ?? `Ventas por ${groupBy === 'hour' ? 'hora' : 'día'}`}
        </p>
        {subtitle && (
          <p className="text-xs font-semibold text-[var(--color-text-primary)] shrink-0 tabular-nums">{subtitle}</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickFormatter={v => formatXAxis(v as number | string, groupBy)}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={v => `$${((v as number) / 100).toFixed(0)}`}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            formatter={(value: number): string => formatCurrency(value)}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
