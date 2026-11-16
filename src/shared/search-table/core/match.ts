import type { FilterState } from '../types.ts'

export const text = (v: unknown) => String(v ?? '').toLowerCase()

/** One filter against one cell. The condition tells the kind. */
export const matches = (cell: unknown, filter: Record<string, unknown>): boolean => {
  switch (filter.condition) {
    case 'contains':
      return text(cell).includes(text(filter.value))
    case 'equals':
      return text(cell) === text(filter.value)
    case 'in':
    case 'notIn': {
      const values = (filter.values as string[]).map(text)
      const prefix = text(filter.prefix)
      const hit = values.some((v) => text(cell) === v || text(cell) === prefix + v)
      return filter.condition === 'in' ? hit : !hit
    }
    case 'is':
      return cell === filter.value
    case 'isEmpty':
      return cell === null || cell === undefined || cell === ''
    case 'before':
      return typeof cell === 'string' && cell < (filter.date as string)
    case 'after':
      return typeof cell === 'string' && cell > (filter.date as string)
    case 'between': {
      if (typeof cell !== 'string') return false
      const { from, to } = filter as { from?: string; to?: string }
      return (!from || cell >= from) && (!to || cell <= to)
    }
    default:
      throw new Error(`Unsupported filter condition: ${String(filter.condition)}`)
  }
}

/** Does a row satisfy every filter? Same rules the backend applies. */
export const matchesFilters = (
  row: Record<string, unknown>,
  filters: FilterState<never> | Record<string, unknown>,
): boolean =>
  Object.entries(filters).every(([id, filter]) =>
    matches(row[id], filter as Record<string, unknown>),
  )
