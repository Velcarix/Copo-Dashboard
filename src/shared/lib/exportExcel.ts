import * as XLSX from 'xlsx'
import { centsToPesos } from './currency'

interface DashboardExportData {
  period: string
  totalSales: number
  avgTicket: number
  ordersCount: number
  customersCount: number
  breakEvenRemaining: number
  goalTarget: number
  salesChart: { label: string; total: number; count: number }[]
  topProducts: { name: string; revenue: number; units: number }[]
  salesByMethod: { method: string; total: number; count: number }[]
  salesByCategory: { category: string; total: number }[]
  salesByEmployee: { name: string; total: number; orders: number }[]
  salesByShift: { shift: string; employee: string; openedAt: string; closedAt: string; total: number; orders: number }[]
  byVariant?: { variantName: string; revenue: number; units: number }[]
  topFlavors?: { name: string; units: number }[]
}

const PERIOD_LABELS: Record<string, string> = {
  today: 'Hoy',
  week:  'Semana',
  month: 'Mes',
  year:  'Año',
}

function pesos(cents: number) {
  return centsToPesos(cents)
}

export function exportDashboardToExcel(data: DashboardExportData, branchLabel: string) {
  const wb = XLSX.utils.book_new()
  const periodLabel = PERIOD_LABELS[data.period] ?? data.period
  const now = new Date().toLocaleString('es-MX')

  // ── Hoja 1: Resumen ───────────────────────────────────────────────────────
  const resumenRows = [
    ['Copo POS — Reporte de métricas'],
    [`Período: ${periodLabel}`, `Sucursal: ${branchLabel}`, `Generado: ${now}`],
    [],
    ['Métrica', 'Valor'],
    ['Ventas totales',          pesos(data.totalSales)],
    ['Ticket promedio',         pesos(data.avgTicket)],
    ['Órdenes',                 data.ordersCount],
    ['Clientes atendidos',      data.customersCount],
    ['Punto de equilibrio restante', pesos(Math.max(0, data.breakEvenRemaining))],
    ['Meta de ventas',          pesos(data.goalTarget)],
    ['% de meta alcanzado',     data.goalTarget > 0
      ? `${Math.min(100, (data.totalSales / data.goalTarget) * 100).toFixed(1)}%`
      : 'Sin meta'],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows)
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 20 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // ── Hoja 2: Ventas en el tiempo ───────────────────────────────────────────
  const ventasRows = [
    ['Período', 'Ventas ($)', 'Órdenes'],
    ...data.salesChart.map(r => [r.label, pesos(r.total), r.count]),
    [],
    ['TOTAL', pesos(data.salesChart.reduce((s, r) => s + r.total, 0)),
              data.salesChart.reduce((s, r) => s + r.count, 0)],
  ]
  const wsVentas = XLSX.utils.aoa_to_sheet(ventasRows)
  wsVentas['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas')

  // ── Hoja 3: Top productos ─────────────────────────────────────────────────
  const productosRows = [
    ['#', 'Producto', 'Ingresos ($)', 'Unidades vendidas'],
    ...data.topProducts.map((r, i) => [i + 1, r.name, pesos(r.revenue), r.units]),
  ]
  const wsProductos = XLSX.utils.aoa_to_sheet(productosRows)
  wsProductos['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 16 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsProductos, 'Top Productos')

  // ── Hoja 4: Métodos de pago ───────────────────────────────────────────────
  const metodosRows = [
    ['Método de pago', 'Ventas ($)', 'Órdenes', '% del total'],
    ...data.salesByMethod.map(r => [
      r.method,
      pesos(r.total),
      r.count,
      data.totalSales > 0
        ? `${((r.total / data.totalSales) * 100).toFixed(1)}%`
        : '0%',
    ]),
  ]
  const wsMetodos = XLSX.utils.aoa_to_sheet(metodosRows)
  wsMetodos['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsMetodos, 'Métodos de pago')

  // ── Hoja 5: Categorías ────────────────────────────────────────────────────
  const categoriasRows = [
    ['Categoría', 'Ventas ($)', '% del total'],
    ...data.salesByCategory.map(r => [
      r.category,
      pesos(r.total),
      data.totalSales > 0
        ? `${((r.total / data.totalSales) * 100).toFixed(1)}%`
        : '0%',
    ]),
  ]
  const wsCategorias = XLSX.utils.aoa_to_sheet(categoriasRows)
  wsCategorias['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsCategorias, 'Categorías')

  // ── Hoja opcional: Variantes (solo si hay ventas VARIANTS en el período) ──
  if (data.byVariant && data.byVariant.length > 0) {
    const variantesRows = [
      ['Variante', 'Ingresos ($)', 'Unidades vendidas'],
      ...data.byVariant.map(r => [r.variantName, pesos(r.revenue), r.units]),
    ]
    const wsVariantes = XLSX.utils.aoa_to_sheet(variantesRows)
    wsVariantes['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsVariantes, 'Variantes')
  }

  // ── Hoja opcional: Sabores (solo si hay ventas PRESENTATION en el período) ──
  if (data.topFlavors && data.topFlavors.length > 0) {
    const saboresRows = [
      ['Sabor', 'Unidades vendidas'],
      ...data.topFlavors.map(r => [r.name, r.units]),
    ]
    const wsSabores = XLSX.utils.aoa_to_sheet(saboresRows)
    wsSabores['!cols'] = [{ wch: 20 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsSabores, 'Sabores')
  }

  // ── Hoja 6: Empleados ─────────────────────────────────────────────────────
  const empleadosRows = [
    ['Empleado', 'Ventas ($)', 'Órdenes'],
    ...data.salesByEmployee.map(r => [r.name, pesos(r.total), r.orders]),
  ]
  const wsEmpleados = XLSX.utils.aoa_to_sheet(empleadosRows)
  wsEmpleados['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsEmpleados, 'Empleados')

  // ── Hoja 7: Turnos ────────────────────────────────────────────────────────
  const turnosRows = [
    ['Turno', 'Empleado', 'Apertura', 'Cierre', 'Ventas ($)', 'Órdenes'],
    ...data.salesByShift.map(r => [
      r.shift, r.employee, r.openedAt, r.closedAt, pesos(r.total), r.orders,
    ]),
  ]
  const wsTurnos = XLSX.utils.aoa_to_sheet(turnosRows)
  wsTurnos['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsTurnos, 'Turnos')

  // ── Descargar ─────────────────────────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10)
  const filename = `copo-metricas-${periodLabel.toLowerCase()}-${date}.xlsx`
  XLSX.writeFile(wb, filename)
}
