// Deterministic formatter — no ICU dependency (safe in jsdom/Node)
export function formatCurrency(cents: number): string {
  const abs = Math.abs(cents)
  const pesos = (abs / 100).toFixed(2)
  const [int, dec] = pesos.split('.')
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${intFormatted}.${dec}`
}

export function centsToPesos(cents: number): number {
  return cents / 100
}

export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100)
}
