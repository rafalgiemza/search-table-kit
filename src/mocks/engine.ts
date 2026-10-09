import type { FilterState, SearchQuery } from '../search-table/types.ts'

type Row = Record<string, unknown>

const text = (v: unknown) => String(v ?? '').toLowerCase()

/** One filter against one cell. The condition tells the kind. */
const matches = (cell: unknown, filter: Record<string, unknown>): boolean => {
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

const compare = (a: unknown, b: unknown) => {
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty || bEmpty) return Number(aEmpty) - Number(bEmpty) // empties last
  return typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b))
}

export type EngineQuery = Pick<SearchQuery<never>, 'search' | 'sort'> & {
  filters: FilterState<never> | Record<string, unknown>
}

/** Filter + multi-column sort. Paging is a separate step (`window`). */
export const filterAndSort = <T extends Row>(rows: readonly T[], query: EngineQuery): T[] => {
  const needle = text(query.search)
  const filters = Object.entries(query.filters) as [string, Record<string, unknown>][]

  const out = rows.filter(
    (row) =>
      (!needle || text(row.description).includes(needle)) &&
      filters.every(([id, filter]) => matches(row[id], filter)),
  )

  return query.sort.length === 0
    ? out
    : out.sort((a, b) => {
        for (const { colId, direction } of query.sort) {
          const c = compare(a[colId], b[colId])
          if (c !== 0) return direction === 'asc' ? c : -c
        }
        return 0
      })
}

export const window = <T>(rows: readonly T[], startRow: number, endRow: number) =>
  rows.slice(startRow, endRow)
