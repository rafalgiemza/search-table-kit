import type { SortDirection } from '../types.ts'

type ColumnSort = {
  colId: string
  sort?: SortDirection | null
  sortIndex?: number | null
}

/**
 * Sort model from the grid's column state, in sort-priority order. The grid
 * is the source of truth for header clicks, so this is what criteria adopt.
 */
export const sortFromColumnState = (
  state: readonly ColumnSort[],
): { colId: string; direction: SortDirection }[] =>
  state
    .filter((c) => c.sort)
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((c) => ({ colId: c.colId, direction: c.sort! }))
