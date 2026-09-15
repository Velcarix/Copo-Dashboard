/**
 * Cada sucursal captura su catálogo a mano, así que el mismo producto llega
 * como "Cono", "cono " o "Conó". En la vista "Todas las sucursales" el backend
 * manda una fila por producto de cada sucursal y el mismo producto salía
 * repetido — estos helpers los juntan por nombre.
 */

/** Clave de comparación: sin mayúsculas, acentos ni espacios de más */
export function nameKey(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Agrupa filas con el mismo nombre, en el orden en que aparece cada nombre por primera vez */
export function groupByName<T>(rows: readonly T[], nameOf: (row: T) => string): T[][] {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = nameKey(nameOf(row))
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return [...groups.values()]
}

type NumericKey<T> = { [K in keyof T]-?: T[K] extends number ? K : never }[keyof T]

/**
 * Junta filas del mismo nombre sumando `sumKeys`. El nombre visible (y el resto
 * de campos) sale de la fila con más `rankBy`, y el resultado queda ordenado de
 * mayor a menor por `rankBy`.
 */
export function mergeByName<T>(
  rows: readonly T[],
  nameOf: (row: T) => string,
  sumKeys: readonly NumericKey<T>[],
  rankBy: NumericKey<T>,
): T[] {
  const num = (row: T, key: NumericKey<T>) => Number(row[key]) || 0
  return groupByName(rows, nameOf)
    .map(group => {
      const base = group.reduce((best, row) => (num(row, rankBy) > num(best, rankBy) ? row : best))
      const sums = Object.fromEntries(sumKeys.map(key => [key, group.reduce((s, row) => s + num(row, key), 0)]))
      return { ...base, ...sums }
    })
    .sort((a, b) => num(b, rankBy) - num(a, rankBy))
}
