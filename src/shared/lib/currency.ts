// Deterministic formatter — no ICU dependency (safe in jsdom/Node)
export function formatCurrency(cents: number): string {
  const abs = Math.abs(cents)
  const pesos = (abs / 100).toFixed(2)
  const [int, dec] = pesos.split('.')
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${intFormatted}.${dec}`
}

/** Etiqueta corta para ejes de gráficas: $250, $1.2k, $15k (recibe centavos).
 *  Debajo de $10k lleva un decimal — redondeando a entero, dos marcas seguidas
 *  del eje salían con la misma etiqueta ("$2k" y "$2k"). */
export function formatChartAxis(cents: number): string {
  const pesos = cents / 100
  if (pesos < 1_000) return `$${pesos.toFixed(0)}`
  return `$${(pesos / 1_000).toFixed(pesos < 10_000 ? 1 : 0)}k`
}

export function centsToPesos(cents: number): number {
  return cents / 100
}

export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100)
}
