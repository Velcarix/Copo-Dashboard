import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { SalesChart } from '../components/SalesChart'
import { ReportTable } from '../components/ReportTable'
import { ProductMixPanels, type ProductMix } from '../components/ProductMixPanels'
import { useCategoryStore } from '@/shared/store/categoryStore'
import { useDataViewBranchParam } from '@/shared/hooks/useDataViewBranch'
import { useVisibilityRefetch } from '@/shared/hooks/useVisibilityRefetch'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SalesDay { day: string; total: number; count: number }
interface BranchSeries { id: string; name: string; data: SalesDay[] }
interface OrderItemRow { name: string; quantity: number }
interface OrderRow { orderNumber: string; createdAt: string; employeeName: string; branchName?: string; paymentMethod: string; totalAmount: string; items?: OrderItemRow[] }
interface ProductSoldRow { name: string; category: string; price: number; quantitySold: number }

// Fallback label map — used when categoryStore hasn't loaded yet or is missing a key.
const CATEGORY_LABEL_FALLBACK: Record<string, string> = {
  ICE_CREAM: 'Helados',
  COFFEE:    'Cafés',
  BEVERAGE:  'Bebidas',
  PASTRY:    'Pasteles',
  SNACK:     'Snacks',
  COMBO:     'Combos',
  EXTRA:     'Extras',
}

// Un color por sucursal, en el mismo orden que usa Inicio y el selector de sucursal.
const BRANCH_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899']

function resolveCategoryLabel(key: string, allCats: { key: string; label: string }[]): string {
  return allCats.find(c => c.key === key)?.label ?? CATEGORY_LABEL_FALLBACK[key] ?? key
}

interface InventoryRow {
  name: string
  branchName?: string
  unit: string
  openingStock: number
  purchased: number
  consumed: number
  waste: number
  closingStock: number
  costOfGoods: number
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

const MOCK_SALES_DAYS: SalesDay[] = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2026, 2, 20 + i)
  return {
    day: d.toLocaleDateString('es-MX', { weekday: 'short' }),
    total: Math.floor(Math.random() * 80000) + 20000,
    count: Math.floor(Math.random() * 25) + 5,
  }
})

// Vista consolidada sin backend (DEV): una serie por sucursal, con los mismos
// nombres que MOCK_BRANCHES del branchStore.
const MOCK_BRANCH_SERIES: BranchSeries[] = ['Sucursal Centro', 'Sucursal Altabrisa', 'Sucursal Cancún'].map((name, i) => ({
  id: `branch-${i + 1}`,
  name,
  data: MOCK_SALES_DAYS.map(d => ({ ...d, total: Math.round(d.total / (i + 2)), count: Math.round(d.count / (i + 2)) })),
}))

const MOCK_PRODUCTS_SOLD: ProductSoldRow[] = [
  { name: 'Malteada de vainilla', category: 'ICE_CREAM', price: 6500,  quantitySold: 34 },
  { name: 'Café americano',       category: 'COFFEE',    price: 3500,  quantitySold: 28 },
  { name: 'Pay de queso',         category: 'PASTRY',    price: 5500,  quantitySold: 12 },
]

// Mismos paneles que Inicio, con datos de ejemplo para trabajar sin backend (DEV).
const MOCK_MIX: ProductMix = {
  topProducts: MOCK_PRODUCTS_SOLD.map(p => ({ name: p.name, revenue: p.price * p.quantitySold, units: p.quantitySold })),
  salesByCategory: [
    { category: 'Helados', total: 221000 },
    { category: 'Cafés',   total: 98000  },
    { category: 'Pasteles', total: 66000 },
  ],
  topFlavors: [
    { name: 'Vainilla', units: 34 },
    { name: 'Chocolate', units: 21 },
    { name: 'Fresa', units: 12 },
  ],
}

const MOCK_INVENTORY: InventoryRow[] = [
  { name: 'Vainilla',     unit: 'grams',  openingStock: 4000, purchased: 0,    consumed: 3200, waste: 0,   closingStock: 800,  costOfGoods: 19200 },
  { name: 'Chocolate',    unit: 'grams',  openingStock: 5000, purchased: 2000, consumed: 3800, waste: 200, closingStock: 3000, costOfGoods: 22800 },
  { name: 'Leche entera', unit: 'liters', openingStock: 15,   purchased: 10,   consumed: 22,   waste: 0,   closingStock: 3,    costOfGoods: 44000 },
  { name: 'Fresa',        unit: 'grams',  openingStock: 8000, purchased: 0,    consumed: 2600, waste: 0,   closingStock: 5400, costOfGoods: 15600 },
  { name: 'Café molido',  unit: 'grams',  openingStock: 3000, purchased: 1000, consumed: 1900, waste: 0,   closingStock: 2100, costOfGoods: 9500  },
]

// ─── Column configs ───────────────────────────────────────────────────────────

const BRANCH_COLUMN = { key: 'branchName', label: 'Sucursal' }

const ORDER_COLUMNS = [
  { key: 'orderNumber',  label: 'Orden'    },
  { key: 'createdAt',    label: 'Fecha'    },
  { key: 'products',     label: 'Producto' },
  { key: 'employeeName', label: 'Empleado' },
  { key: 'paymentMethod',label: 'Método'   },
  { key: 'totalAmount',  label: 'Total'    },
]

const PRODUCT_COLUMNS = [
  { key: 'name',         label: 'Producto'  },
  { key: 'category',     label: 'Categoría' },
  { key: 'price',        label: 'Precio'    },
  { key: 'quantitySold', label: 'Vendidos'  },
]

const INVENTORY_COLUMNS = [
  { key: 'name',         label: 'Ingrediente' },
  { key: 'unit',         label: 'Unidad'      },
  { key: 'openingStock', label: 'Inicio'      },
  { key: 'purchased',    label: 'Compras'     },
  { key: 'consumed',     label: 'Consumo'     },
  { key: 'waste',        label: 'Merma'       },
  { key: 'closingStock', label: 'Cierre'      },
  { key: 'costOfGoods',  label: 'Costo MXN'  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'sales' | 'inventory'
/** 'day' = un día concreto (gráfica por hora); 'range' = rango de fechas (gráfica por día) */
type RangeMode = 'day' | 'range'

/** 'YYYY-MM-DD' en hora local — `toISOString()` usa UTC y adelanta el día por la tarde */
function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

/** Mueve una fecha 'YYYY-MM-DD' n días — sirve para las flechas ‹ › del modo día */
function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return isoDate(date)
}

const DATE_LABEL_FMT = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
function humanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return DATE_LABEL_FMT.format(new Date(y, m - 1, d))
}

const ORDER_DATE_FMT = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: '2-digit', year: '2-digit',
  hour: '2-digit', minute: '2-digit',
})
/** El backend manda instantes UTC; sin formatear, la tabla mostraba "…T20:41Z" (6 h adelantado) */
function humanDateTime(value: string): string {
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : ORDER_DATE_FMT.format(d)
}

function formatInventoryRows(rows: InventoryRow[]): Record<string, string | number>[] {
  return rows.map(r => ({ ...r, branchName: r.branchName ?? '—', costOfGoods: formatCurrency(r.costOfGoods) }))
}

function formatOrderRows(rows: OrderRow[]): Record<string, string | number>[] {
  return rows.map(({ items, ...r }) => ({
    ...r,
    branchName: r.branchName ?? '—',
    createdAt: humanDateTime(r.createdAt),
    products: (items ?? []).map(i => i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name).join(', '),
    totalAmount: formatCurrency(Number(r.totalAmount)),
  }))
}

function formatProductRows(rows: ProductSoldRow[], categories: { key: string; label: string }[]): Record<string, string | number>[] {
  return rows.map(r => ({
    name: r.name,
    category: resolveCategoryLabel(r.category, categories),
    price: formatCurrency(r.price),
    quantitySold: r.quantitySold,
  }))
}

/** Rellena con ceros los días sin ventas del rango para que la línea sea continua */
function fillMissingDays(days: SalesDay[], from: string, to: string): SalesDay[] {
  const byDay = new Map(days.map(d => [d.day, d]))
  const result: SalesDay[] = []
  const cursor = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (cursor <= end) {
    const key = isoDate(cursor)
    result.push(byDay.get(key) ?? { day: key, total: 0, count: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

/** Igual que fillMissingDays pero para las 24 horas de un solo día */
function fillMissingHours(points: SalesDay[]): SalesDay[] {
  const byHour = new Map(points.map(p => [p.day, p]))
  return Array.from({ length: 24 }, (_, h) => {
    const key = `${String(h).padStart(2, '0')}:00`
    return byHour.get(key) ?? { day: key, total: 0, count: 0 }
  })
}

function fillSeries(points: SalesDay[], from: string, to: string, mode: RangeMode): SalesDay[] {
  return mode === 'day' ? fillMissingHours(points) : fillMissingDays(points, from, to)
}

function sumTotal(days: SalesDay[]): number { return days.reduce((s, d) => s + d.total, 0) }
function sumCount(days: SalesDay[]): number { return days.reduce((s, d) => s + d.count, 0) }

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { branchParam, isAll } = useDataViewBranchParam()
  const [tab, setTab] = useState<Tab>('sales')

  // ── Selección de fechas: un día concreto o un rango ──
  const today = isoDate(new Date())
  const [mode, setMode] = useState<RangeMode>('range')
  const [day, setDay] = useState(() => isoDate(new Date()))
  const [from, setFrom] = useState(() => daysAgo(6))
  const [to, setTo] = useState(() => isoDate(new Date()))

  // Si el usuario invierte el rango (from > to) se consulta igual en vez de
  // devolver cero resultados sin explicación.
  const [queryFrom, queryTo] = useMemo(() => {
    if (mode === 'day') return [day, day]
    return from <= to ? [from, to] : [to, from]
  }, [mode, day, from, to])

  const [salesDays, setSalesDays] = useState<SalesDay[]>([])
  const [branchSeries, setBranchSeries] = useState<BranchSeries[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotal, setOrdersTotal] = useState(0)

  const [inventory, setInventory] = useState<InventoryRow[]>([])

  const [productsSold, setProductsSold] = useState<ProductSoldRow[]>([])
  // Top de productos, categorías, variantes, sabores y extras del rango — las
  // mismas agregaciones que muestra Inicio, aquí para las fechas elegidas.
  const [mix, setMix] = useState<ProductMix>({})

  const categories = useCategoryStore(s => s.categories)
  const categoriesBranchId = useCategoryStore(s => s.branchId)
  const loadCategories = useCategoryStore(s => s.load)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // En vista consolidada no hay un branchId único de categorías: se usan las de
    // la sesión activa, que pertenecen al mismo negocio.
    if (!isAll && branchParam && categoriesBranchId !== branchParam) loadCategories(branchParam)
  }, [isAll, branchParam, categoriesBranchId, loadCategories])

  // Cambiar de sucursal, de fechas o de pestaña invalida la paginación: quedarse
  // en la página 5 de un filtro nuevo mostraba una tabla vacía.
  useEffect(() => { setOrdersPage(1) }, [branchParam, queryFrom, queryTo, tab])

  const load = useCallback(() => {
    setLoading(true)
    const scope = `branchId=${branchParam}&from=${queryFrom}&to=${queryTo}`
    if (tab === 'sales') {
      Promise.all([
        api.get<{ data: { data: SalesDay[]; branches?: BranchSeries[] } }>(
          `/api/v1/reports/sales?${scope}&groupBy=${mode === 'day' ? 'hour' : 'day'}`,
        ),
        api.get<{ data: OrderRow[]; total: number }>(`/api/v1/orders?${scope}&page=${ordersPage}&limit=20`),
        api.get<{ data: ProductSoldRow[] }>(`/api/v1/reports/products?${scope}`),
        // Un backend sin /reports/mix desplegado no debe tumbar el resto de la
        // pestaña: los paneles simplemente no se dibujan.
        api.get<{ data: ProductMix }>(`/api/v1/reports/mix?${scope}`).catch(() => ({ data: {} as ProductMix })),
      ])
        .then(([salesRes, ordersRes, productsRes, mixRes]) => {
          setSalesDays(fillSeries(salesRes.data.data ?? [], queryFrom, queryTo, mode))
          setBranchSeries(
            (salesRes.data.branches ?? []).map(b => ({
              ...b,
              data: fillSeries(b.data ?? [], queryFrom, queryTo, mode),
            })),
          )
          setOrders(ordersRes.data)
          setOrdersTotal(ordersRes.total)
          setProductsSold(Array.isArray(productsRes.data) ? productsRes.data : [])
          setMix(mixRes.data ?? {})
        })
        .catch(() => {
          if (import.meta.env.DEV) {
            setSalesDays(MOCK_SALES_DAYS); setBranchSeries(isAll ? MOCK_BRANCH_SERIES : [])
            setOrders([]); setOrdersTotal(0); setProductsSold(MOCK_PRODUCTS_SOLD)
            setMix(MOCK_MIX)
          }
        })
        .finally(() => setLoading(false))
    } else {
      api.get<{ data: InventoryRow[] }>(`/api/v1/reports/inventory?${scope}`)
        .then(res => setInventory(Array.isArray(res.data) ? res.data : []))
        .catch(() => { if (import.meta.env.DEV) setInventory(MOCK_INVENTORY) })
        .finally(() => setLoading(false))
    }
    // branchParam (Vista de datos) faltaba en las dependencias — cambiar de sucursal
    // no refrescaba reportes/órdenes/inventario hasta cambiar tab/fechas.
  }, [tab, queryFrom, queryTo, mode, ordersPage, branchParam, isAll])

  useEffect(load, [load])
  useVisibilityRefetch(load)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'sales',     label: 'Ventas'     },
    { id: 'inventory', label: 'Inventario' },
  ]

  const PRESETS: { id: string; label: string; apply: () => void }[] = [
    { id: 'today',     label: 'Hoy',      apply: () => { setMode('day');   setDay(today) } },
    { id: 'yesterday', label: 'Ayer',     apply: () => { setMode('day');   setDay(daysAgo(1)) } },
    { id: '7d',        label: '7 días',   apply: () => { setMode('range'); setFrom(daysAgo(6));  setTo(today) } },
    { id: '30d',       label: '30 días',  apply: () => { setMode('range'); setFrom(daysAgo(29)); setTo(today) } },
  ]

  const activePreset =
    mode === 'day'
      ? (day === today ? 'today' : day === daysAgo(1) ? 'yesterday' : null)
      : to === today && from === daysAgo(6) ? '7d'
      : to === today && from === daysAgo(29) ? '30d'
      : null

  const rangeLabel = mode === 'day'
    ? humanDate(day)
    : `${humanDate(queryFrom)} – ${humanDate(queryTo)}`

  const orderColumns   = isAll ? [BRANCH_COLUMN, ...ORDER_COLUMNS] : ORDER_COLUMNS
  const inventoryColumns = isAll ? [INVENTORY_COLUMNS[0], BRANCH_COLUMN, ...INVENTORY_COLUMNS.slice(1)] : INVENTORY_COLUMNS

  const periodTotal  = sumTotal(salesDays)
  const periodOrders = sumCount(salesDays)

  const dateInputClass = 'px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] min-h-[40px]'
  const stepBtnClass = 'px-2.5 min-h-[40px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-lg leading-none transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text-secondary)]'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Reportes</h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {isAll ? 'Todas las sucursales' : 'Sucursal seleccionada'} · {rangeLabel}
            </p>
          </div>

          {/* Día concreto vs rango de fechas */}
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs">
            {([['day', 'Un día'], ['range', 'Rango']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={`px-3 py-2 min-h-[40px] transition-colors ${
                  mode === id
                    ? 'bg-[var(--color-accent)] text-white font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-sm">
          {mode === 'day' ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDay(d => shiftDay(d, -1))}
                aria-label="Día anterior"
                className={stepBtnClass}
              >
                <span aria-hidden="true">‹</span>
              </button>
              <input
                type="date" value={day} max={today}
                onChange={e => { if (e.target.value) setDay(e.target.value) }}
                aria-label="Día"
                className={dateInputClass}
              />
              <button
                type="button"
                onClick={() => setDay(d => shiftDay(d, 1))}
                disabled={day >= today}
                aria-label="Día siguiente"
                className={stepBtnClass}
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          ) : (
            <>
              <input
                type="date" value={from} onChange={e => setFrom(e.target.value)}
                aria-label="Desde"
                className={dateInputClass}
              />
              <span className="text-[var(--color-text-muted)]">—</span>
              <input
                type="date" value={to} onChange={e => setTo(e.target.value)}
                aria-label="Hasta"
                className={dateInputClass}
              />
            </>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={p.apply}
                aria-pressed={activePreset === p.id}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  activePreset === p.id
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-[var(--color-border)] overflow-hidden w-fit text-sm">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-accent)] text-white font-medium'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Sales tab ─── */}
          {tab === 'sales' && (
            <div className="space-y-5">
              <SalesChart
                data={salesDays}
                groupBy="day"
                title={
                  mode === 'day'
                    ? (isAll ? 'Ventas por hora — todas las sucursales' : 'Ventas por hora')
                    : (isAll ? 'Ventas por día — todas las sucursales' : 'Ventas por día')
                }
                subtitle={formatCurrency(periodTotal)}
              />

              {/* Una gráfica por sucursal en la vista consolidada */}
              {isAll && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Ventas por sucursal</h2>
                  {branchSeries.length === 0 ? (
                    <p className="text-center py-8 text-[var(--color-text-muted)] text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
                      Sin sucursales con ventas en el período
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {branchSeries.map((b, i) => (
                        <SalesChart
                          key={b.id}
                          data={b.data}
                          groupBy="day"
                          title={b.name}
                          subtitle={`${formatCurrency(sumTotal(b.data))} · ${sumCount(b.data)} órd.`}
                          color={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                          height={160}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {salesDays.length > 0 && (
                <div className={`grid ${isAll ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-3 text-sm bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]`}>
                  <div>
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Total período</p>
                    <p className="font-bold text-[var(--color-text-primary)] text-lg tabular-nums">
                      {formatCurrency(periodTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Órdenes</p>
                    <p className="font-bold text-[var(--color-text-primary)] text-lg tabular-nums">
                      {periodOrders}
                    </p>
                  </div>
                  {isAll && (
                    <div>
                      <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Sucursales</p>
                      <p className="font-bold text-[var(--color-text-primary)] text-lg tabular-nums">
                        {branchSeries.length}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Qué se vendió en el rango — mismos paneles que Inicio */}
              <ProductMixPanels {...mix} />

              <ReportTable
                columns={orderColumns}
                data={formatOrderRows(orders)}
                total={ordersTotal}
                page={ordersPage}
                onPageChange={setOrdersPage}
              />

              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Productos vendidos</h2>
                <ReportTable
                  columns={PRODUCT_COLUMNS}
                  data={formatProductRows(productsSold, categories)}
                  total={productsSold.length}
                  page={1}
                  onPageChange={() => {}}
                />
              </div>
            </div>
          )}

          {/* ── Inventory tab ─── */}
          {tab === 'inventory' && (
            <div className="space-y-4">
              {inventory.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)] text-sm">Sin datos de inventario para el período</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Ingredientes</p>
                      <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">{inventory.length}</p>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Merma total</p>
                      <p className="text-lg font-bold text-amber-500 tabular-nums">{inventory.reduce((s, r) => s + r.waste, 0)}</p>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Costo MP</p>
                      <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
                        {formatCurrency(inventory.reduce((s, r) => s + r.costOfGoods, 0))}
                      </p>
                    </div>
                  </div>
                  <ReportTable
                    columns={inventoryColumns}
                    data={formatInventoryRows(inventory)}
                    total={inventory.length}
                    page={1}
                    onPageChange={() => {}}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
