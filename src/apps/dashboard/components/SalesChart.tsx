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
}

function formatXAxis(value: number | string, groupBy: 'hour' | 'day'): string {
  if (groupBy === 'hour' && typeof value === 'number') {
    const h = value % 12 || 12
    return `${h}${value < 12 ? 'am' : 'pm'}`
  }
  return String(value)
}

export function SalesChart({ data, groupBy }: SalesChartProps) {
  const xKey = groupBy === 'hour' ? 'hour' : 'day'

  return (
    <div data-testid="sales-chart" className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
        Ventas por {groupBy === 'hour' ? 'hora' : 'día'}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickFormatter={v => formatXAxis(v as number | string, groupBy)}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
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
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
