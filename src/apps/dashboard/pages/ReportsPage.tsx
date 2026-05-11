import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { formatCurrency } from '@/shared/lib/currency'
import { SalesChart } from '../components/SalesChart'
import { ReportTable } from '../components/ReportTable'
import { useAuthStore } from '@/shared/store/authStore'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SalesDay { day: string; total: number; count: number }
interface OrderRow { orderNumber: string; createdAt: string; employeeName: string; paymentMethod: string; totalAmount: string }

interface InventoryRow {
  name: string
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

const MOCK_INVENTORY: InventoryRow[] = [
  { name: 'Vainilla',     unit: 'grams',  openingStock: 4000, purchased: 0,    consumed: 3200, waste: 0,   closingStock: 800,  costOfGoods: 19200 },
  { name: 'Chocolate',    unit: 'grams',  openingStock: 5000, purchased: 2000, consumed: 3800, waste: 200, closingStock: 3000, costOfGoods: 22800 },
  { name: 'Leche entera', unit: 'liters', openingStock: 15,   purchased: 10,   consumed: 22,   waste: 0,   closingStock: 3,    costOfGoods: 44000 },
  { name: 'Fresa',        unit: 'grams',  openingStock: 8000, purchased: 0,    consumed: 2600, waste: 0,   closingStock: 5400, costOfGoods: 15600 },
  { name: 'Café molido',  unit: 'grams',  openingStock: 3000, purchased: 1000, consumed: 1900, waste: 0,   closingStock: 2100, costOfGoods: 9500  },
]

// ─── Column configs ───────────────────────────────────────────────────────────

const ORDER_COLUMNS = [
  { key: 'orderNumber',  label: 'Orden'    },
  { key: 'createdAt',    label: 'Fecha'    },
  { key: 'employeeName', label: 'Empleado' },
  { key: 'paymentMethod',label: 'Método'   },
  { key: 'totalAmount',  label: 'Total'    },
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

function formatInventoryRows(rows: InventoryRow[]): Record<string, string | number>[] {
  return rows.map(r => ({ ...r, costOfGoods: formatCurrency(r.costOfGoods) }))
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportsPage() {
  const branchId = useAuthStore(s => s.branchId)
  const [tab, setTab] = useState<Tab>('sales')

  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))

  const [salesDays, setSalesDays] = useState<SalesDay[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotal, setOrdersTotal] = useState(0)

  const [inventory, setInventory] = useState<InventoryRow[]>([])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    if (tab === 'sales') {
      Promise.all([
        api.get<{ data: { data: SalesDay[] } }>(`/api/v1/reports/sales?branchId=${branchId}&from=${from}&to=${to}&groupBy=day`),
        api.get<{ data: OrderRow[]; total: number }>(`/api/v1/orders?branchId=${branchId}&from=${from}&to=${to}&page=${ordersPage}&limit=20`),
      ])
        .then(([salesRes, ordersRes]) => {
          setSalesDays(salesRes.data.data)
          setOrders(ordersRes.data)
          setOrdersTotal(ordersRes.total)
        })
        .catch(() => {
          if (import.meta.env.DEV) { setSalesDays(MOCK_SALES_DAYS); setOrders([]); setOrdersTotal(0) }
        })
        .finally(() => setLoading(false))
    } else {
      api.get<{ data: InventoryRow[] }>(`/api/v1/reports/inventory?branchId=${branchId}&from=${from}&to=${to}`)
        .then(res => setInventory(res.data))
        .catch(() => { if (import.meta.env.DEV) setInventory(MOCK_INVENTORY) })
        .finally(() => setLoading(false))
    }
  }, [tab, from, to, ordersPage])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'sales',     label: 'Ventas'     },
    { id: 'inventory', label: 'Inventario' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Reportes</h1>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
          />
          <span className="text-[var(--color-text-muted)]">—</span>
          <input
            type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
          />
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
              <SalesChart data={salesDays} groupBy="day" />

              {salesDays.length > 0 && (
                <div className="grid grid-cols-2 gap-3 text-sm bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
                  <div>
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Total período</p>
                    <p className="font-bold text-[var(--color-text-primary)] text-lg">
                      {formatCurrency(salesDays.reduce((s, d) => s + d.total, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Órdenes</p>
                    <p className="font-bold text-[var(--color-text-primary)] text-lg">
                      {salesDays.reduce((s, d) => s + d.count, 0)}
                    </p>
                  </div>
                </div>
              )}

              <ReportTable
                columns={ORDER_COLUMNS}
                data={orders as unknown as Record<string, string | number>[]}
                total={ordersTotal}
                page={ordersPage}
                onPageChange={setOrdersPage}
              />
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
                      <p className="text-lg font-bold text-[var(--color-text-primary)]">{inventory.length}</p>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Merma total</p>
                      <p className="text-lg font-bold text-amber-500">{inventory.reduce((s, r) => s + r.waste, 0)}</p>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Costo MP</p>
                      <p className="text-lg font-bold text-[var(--color-text-primary)]">
                        {formatCurrency(inventory.reduce((s, r) => s + r.costOfGoods, 0))}
                      </p>
                    </div>
                  </div>
                  <ReportTable
                    columns={INVENTORY_COLUMNS}
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
