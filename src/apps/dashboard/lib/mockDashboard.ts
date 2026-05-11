// Mock data for local development only — never called in production

type Period = 'today' | 'week' | 'month' | 'year'

export function getMockData(
  period: Period,
  _isGlobal: boolean,
  branches: { id: string; name: string; isActive: boolean }[],
) {
  const totalSales =
    period === 'today' ? 435_000
    : period === 'week'  ? 2_800_000
    : period === 'month' ? 11_500_000
    : 138_000_000

  const ordersCount =
    period === 'today' ? 56
    : period === 'week'  ? 340
    : period === 'month' ? 1_380
    : 16_560

  // Build time-series chart labels
  let salesChart: { label: string; total: number; count: number }[] = []
  if (period === 'today') {
    salesChart = Array.from({ length: 13 }, (_, i) => ({
      label: `${(8 + i).toString().padStart(2, '0')}h`,
      total: Math.floor(Math.random() * 55_000) + 5_000,
      count: Math.floor(Math.random() * 14) + 1,
    }))
  } else if (period === 'week') {
    salesChart = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => ({
      label: d,
      total: Math.floor(Math.random() * 480_000) + 120_000,
      count: Math.floor(Math.random() * 75) + 20,
    }))
  } else if (period === 'month') {
    salesChart = Array.from({ length: 30 }, (_, i) => ({
      label: String(i + 1),
      total: Math.floor(Math.random() * 550_000) + 100_000,
      count: Math.floor(Math.random() * 85) + 10,
    }))
  } else {
    salesChart = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(m => ({
      label: m,
      total: Math.floor(Math.random() * 11_000_000) + 3_500_000,
      count: Math.floor(Math.random() * 1_100) + 300,
    }))
  }

  // Multi-branch line chart data
  const activeBranches = branches.filter(b => b.isActive)
  const branchSalesChart = salesChart.map(({ label }) => {
    const entry: { label: string; [k: string]: number | string } = { label }
    activeBranches.forEach(b => {
      entry[b.name] = Math.floor(Math.random() * 180_000) + 40_000
    })
    return entry
  })

  return {
    totalSales,
    avgTicket: Math.round(totalSales / ordersCount),
    ordersCount,
    customersCount: Math.floor(ordersCount * 0.87),
    breakEvenRemaining: Math.max(0, 200_000 - totalSales),
    lowStockItems: [
      { name: 'Vainilla',       currentStock: 800, minStock: 1000 },
      { name: 'Leche entera',   currentStock: 3,   minStock: 10   },
    ],
    salesChart,
    branchSalesChart,
    topProducts: [
      { name: 'Copa Esp. Vainilla',   revenue: 164_500, units: 47 },
      { name: 'Café Americano',       revenue: 132_000, units: 33 },
      { name: 'Frappé Moka',         revenue:  98_000, units: 28 },
      { name: 'Croissant Mantequilla',revenue:  87_000, units: 29 },
      { name: 'Mango con Chile',      revenue:  76_500, units: 51 },
      { name: 'Brownie',              revenue:  65_000, units: 26 },
      { name: 'Combo Pareja',         revenue:  61_000, units: 12 },
      { name: 'Limonada Natural',     revenue:  54_000, units: 36 },
      { name: 'Waffle Chocolate',     revenue:  48_500, units: 19 },
      { name: 'Capuchino',            revenue:  42_000, units: 21 },
    ],
    salesByMethod: [
      { method: 'Efectivo',       total: Math.floor(totalSales * 0.45), count: Math.floor(ordersCount * 0.45) },
      { method: 'Tarjeta',        total: Math.floor(totalSales * 0.35), count: Math.floor(ordersCount * 0.35) },
      { method: 'QR / Transfer.', total: Math.floor(totalSales * 0.20), count: Math.floor(ordersCount * 0.20) },
    ],
    salesByCategory: [
      { category: 'Helados',  total: Math.floor(totalSales * 0.40) },
      { category: 'Cafés',    total: Math.floor(totalSales * 0.25) },
      { category: 'Pasteles', total: Math.floor(totalSales * 0.15) },
      { category: 'Bebidas',  total: Math.floor(totalSales * 0.10) },
      { category: 'Snacks',   total: Math.floor(totalSales * 0.07) },
      { category: 'Combos',   total: Math.floor(totalSales * 0.03) },
    ],
    salesByEmployee: [
      { name: 'Ana García',    total: Math.floor(totalSales * 0.38), orders: Math.floor(ordersCount * 0.38) },
      { name: 'Carlos Méndez', total: Math.floor(totalSales * 0.35), orders: Math.floor(ordersCount * 0.35) },
      { name: 'Laura Torres',  total: Math.floor(totalSales * 0.27), orders: Math.floor(ordersCount * 0.27) },
    ],
    salesByShift: [
      { shift: 'Mañana', employee: 'Ana García',    openedAt: '08:00', closedAt: '14:00', total: Math.floor(totalSales * 0.35), orders: Math.floor(ordersCount * 0.35) },
      { shift: 'Tarde',  employee: 'Carlos Méndez', openedAt: '14:00', closedAt: '20:00', total: Math.floor(totalSales * 0.40), orders: Math.floor(ordersCount * 0.40) },
      { shift: 'Noche',  employee: 'Laura Torres',  openedAt: '20:00', closedAt: '22:00', total: Math.floor(totalSales * 0.25), orders: Math.floor(ordersCount * 0.25) },
    ],
  }
}

// Legacy exports kept for backward compatibility
export const MOCK_DASHBOARD = {
  salesToday: 435_000, salesMonth: 8_200_000, avgTicket: 7_800,
  topProduct: { name: 'Copa Especial Vainilla', units: 47 },
  peakHour: '19:00–20:00', estimatedProfit: 3_250_000,
  lowStockItems: [
    { name: 'Vainilla',     currentStock: 800, minStock: 1000 },
    { name: 'Leche entera', currentStock: 3,   minStock: 10   },
  ],
  breakEvenRemaining: 0,
  activeCashDifference: null as number | null,
}

export const MOCK_SALES_HOURS = Array.from({ length: 12 }, (_, i) => ({
  hour: i + 8,
  total: Math.floor(Math.random() * 60_000) + 5_000,
  count: Math.floor(Math.random() * 15) + 1,
}))

export const MOCK_RECENT_ORDERS = Array.from({ length: 8 }, (_, i) => ({
  orderNumber: `2026-${(i + 1).toString().padStart(4, '0')}`,
  time: `${(9 + i).toString().padStart(2, '0')}:${(i * 7 % 60).toString().padStart(2, '0')}`,
  items: `${(i % 3) + 1} items`,
  method: (['Efectivo', 'Tarjeta', 'QR'] as const)[i % 3],
  total: `$${((3500 + i * 1200) / 100).toFixed(2)}`,
}))
