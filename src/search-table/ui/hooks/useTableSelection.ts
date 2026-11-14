import type { GridApi } from 'ag-grid-community'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { withPredicate } from '../../core/criteria.ts'
import {
  emptySelection,
  isRowSelectable,
  pageSelectionState,
  selectionSize,
  setPageSelected,
  setRowSelected,
  type PageState,
  type SelectionState,
} from '../../core/selection.ts'
import type { FetchRows, FieldMap, SearchCriteria, SearchPageConfig } from '../../types.ts'
import { useMatchingCount } from './useMatchingCount.ts'

/**
 * "Select all N matching" is switched off while the backend search API is unreliable. With it off the
 * table never starts a criteria selection and skips the zero-row count query; flip to bring it back.
 */
export const SELECT_ALL_MATCHING = false

/** Selection state plus everything derived from it: page state, size, selected rows. */
export function useTableSelection<TRow, TFields extends FieldMap>({
  config,
  api,
  criteria,
  fetchRows,
  total,
  seen,
  byIndex,
  modelTick,
}: {
  config: SearchPageConfig<TRow, TFields>
  api: GridApi<TRow> | undefined
  criteria: SearchCriteria<TFields>
  fetchRows: FetchRows<TRow, TFields>
  total: number
  seen: ReadonlyMap<string, TRow>
  byIndex: ReadonlyMap<number, TRow>
  /** Bumped on grid model updates (page changes) to re-read the page's rows. */
  modelTick: number
}) {
  const [selection, setSelection] = useState<SelectionState<TFields>>(emptySelection)
  const policy = config.selection
  const selectMode = policy?.mode ?? ((config.actions ?? []).length > 0 ? 'multiple' : 'none')

  const clearSelection = useCallback(() => setSelection(emptySelection()), [])

  const pageRows = useCallback((): TRow[] => {
    if (!api) return []
    const size = api.paginationGetPageSize()
    const start = api.paginationGetCurrentPage() * size
    const rows: TRow[] = []
    for (let i = start; i < Math.min(start + size, total); i++) {
      const row = byIndex.get(i)
      if (row) rows.push(row)
    }
    return rows
  }, [api, byIndex, total])

  const isSelectable = useCallback(
    (row: TRow) => selectMode !== 'none' && isRowSelectable(row, policy),
    [selectMode, policy],
  )

  const pageState = useCallback(
    (): PageState =>
      pageSelectionState(
        selection,
        pageRows().filter(isSelectable).map(config.getRowId),
      ),
    [pageRows, isSelectable, selection, config],
  )

  // Read from the grid on every render; `modelTick` re-renders on page changes.
  void modelTick
  const pageAll = pageState() === 'all'
  const pageCount = pageRows().filter(isSelectable).length

  useEffect(() => {
    api?.redrawRows()
    api?.refreshHeader()
  }, [api, selection, criteria.filters, modelTick])

  const toggle = (id: string, on: boolean) =>
    setSelection((s) =>
      selectMode === 'single' && on
        ? { kind: 'ids', ids: new Set([id]) }
        : setRowSelected(s, id, on),
    )

  const togglePage = (on: boolean) => {
    if (selectMode !== 'multiple') return
    setSelection((s) =>
      setPageSelected(s, pageRows().filter(isSelectable).map(config.getRowId), on),
    )
  }

  const selectedRows = useMemo(
    () =>
      selection.kind === 'ids'
        ? [...selection.ids].flatMap((id) => seen.get(id) ?? [])
        : [],
    [selection, seen],
  )

  // "All matching" must count what the server will actually act on, so the
  // page's predicate is included. Its size comes from a zero-row query.
  const matchingCriteria = useMemo(
    () => withPredicate(criteria, policy?.selectableWhen),
    [criteria, policy],
  )
  const { total: matching, failed: matchingFailed } = useMatchingCount(
    selection.kind === 'all' ? selection.criteria : matchingCriteria,
    fetchRows,
    selectMode !== 'none' && (selection.kind === 'all' || (SELECT_ALL_MATCHING && pageAll)),
  )
  const count = selectionSize(selection, total, matching)

  return {
    selection,
    setSelection,
    clearSelection,
    selectMode,
    policy,
    isSelectable,
    pageState,
    pageAll,
    pageCount,
    toggle,
    togglePage,
    selectedRows,
    matching,
    matchingFailed,
    count,
  }
}
