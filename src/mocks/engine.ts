import { matchesFilters, text } from '../search-table/core/match.ts'
import type { FilterState, SearchQuery } from '../search-table/types.ts'

type Row = Record<string, unknown>

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
  const out = rows.filter(
    (row) =>
      (!needle || text(row.description).includes(needle)) &&
      matchesFilters(row, query.filters),
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
