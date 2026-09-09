import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { formatCurrency, formatChartAxis } from '@/shared/lib/currency'

// Mismo orden de colores que el selector de sucursal y las gráficas de Inicio.
const CATEGORY_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899']

const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
} as const

const AXIS_TICK = { fontSize: 9, fill: 'var(--color-text-muted)' } as const

export interface ProductMix {
  topProducts?: Array<{ name: string; revenue: number; units: number }>
  salesByCategory?: Array<{ category: string; total: number }>
  // Solo llegan con datos cuando el catálogo usa VARIANTS/PRESENTATION o extras
  // con precio (docs/modos-de-cobro/03-BACKEND-API.md §5).
  byVariant?: Array<{ variantName: string; revenue: number; units: number }>
  topFlavors?: Array<{ name: string; units: number }>
  extras?: { attachRate: number; top: Array<{ name: string; revenue: number; units: number }> }
}

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{title}</p>
        {aside}
      </div>
      {children}
    </div>
  )
}

/**
 * Paneles de "qué se vendió": top de productos, ventas por categoría, mix por
 * variante, top de sabores y extras. Inicio los muestra para el período
 * seleccionado y Reportes para el rango de fechas — la misma vista en ambos
 * lados, alimentada por las mismas agregaciones del backend
 * (GET /reports/dashboard y GET /reports/mix).
 *
 * Cada panel se oculta si no hay datos: un negocio sin variantes ni extras no
 * ve gráficas vacías.
 */
export function ProductMixPanels({ topProducts, salesByCategory, byVariant, topFlavors, extras }: ProductMix) {
  const products = topProducts?.slice(0, 10) ?? []
  const categories = salesByCategory ?? []
  const variants = byVariant ?? []
  const flavors = topFlavors ?? []
  const topExtras = extras?.top ?? []

  if (products.length === 0 && categories.length === 0 && variants.length === 0 && flavors.length === 0 && topExtras.length === 0) {
    return null
  }

  return (
    <div className="space-y-4" data-testid="product-mix-panels">
      {(products.length > 0 || categories.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {products.length > 0 && (
            <Panel title="Top 10 productos por ingreso">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart layout="vertical" data={products} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <XAxis type="number" tickFormatter={formatChartAxis} tick={AXIS_TICK} />
                  <YAxis type="category" dataKey="name" width={110} tick={AXIS_TICK} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="revenue" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}

          {categories.length > 0 && (
            <Panel title="Ventas por categoría">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart layout="vertical" data={categories} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <XAxis type="number" tickFormatter={formatChartAxis} tick={AXIS_TICK} />
                  <YAxis type="category" dataKey="category" width={70} tick={AXIS_TICK} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {categories.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}
        </div>
      )}

      {(variants.length > 0 || flavors.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {variants.length > 0 && (
            <Panel title="Mix por variante">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" data={variants} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <XAxis type="number" tickFormatter={formatChartAxis} tick={AXIS_TICK} />
                  <YAxis type="category" dataKey="variantName" width={90} tick={AXIS_TICK} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="revenue" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}

          {flavors.length > 0 && (
            <Panel title="Top sabores (unidades)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" data={flavors} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                  <YAxis type="category" dataKey="name" width={90} tick={AXIS_TICK} />
                  <Tooltip formatter={(v: number) => `${v} unidades`} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="units" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}
        </div>
      )}

      {topExtras.length > 0 && (
        <Panel
          title="Extras"
          aside={
            <span className="text-xs text-[var(--color-text-secondary)]">
              Attach rate:{' '}
              <strong className="text-[var(--color-text-primary)]">
                {Math.round((extras?.attachRate ?? 0) * 100)}%
              </strong>
            </span>
          }
        >
          <div className="space-y-2">
            {topExtras.map(e => (
              <div key={e.name} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">{e.name}</span>
                <span className="text-[var(--color-text-muted)]">
                  {e.units} u. · <strong className="text-[var(--color-text-primary)]">{formatCurrency(e.revenue)}</strong>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
