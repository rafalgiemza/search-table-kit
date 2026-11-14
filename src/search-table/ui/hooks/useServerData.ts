import type { GridApi, IServerSideDatasource } from 'ag-grid-community'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { filtersKey, queryKey, toQuery } from '../../core/criteria.ts'
import type { SearchAction } from '../../core/search-state.ts'
import { sortFromColumnState } from '../../core/sort.ts'
import type {
  FetchRows,
  FieldMap,
  SearchCriteria,
  SearchPageConfig,
} from '../../types.ts'

/** Sort as the grid currently has it; the grid is the source of truth for header clicks. */
const readSort = (api?: GridApi) => sortFromColumnState(api?.getColumnState() ?? [])

/**
 * Bridges criteria and the grid's server-side row model: the datasource, the
 * rows seen so far, and keeping grid and criteria in sync (sort both ways).
 */
export function useServerData<TRow, TFields extends FieldMap>({
  config,
  fetchRows,
  criteria,
  dispatch,
  api,
  pageSize,
}: {
  config: SearchPageConfig<TRow, TFields>
  fetchRows: FetchRows<TRow, TFields>
  criteria: SearchCriteria<TFields>
  dispatch: (action: SearchAction<TFields>) => void
  api: GridApi<TRow> | undefined
  pageSize: number
}) {
  const [total, setTotal] = useState(0)
  /** Rows seen so far, so selected ids can be shown and checked against rules. */
  const [seen] = useState(() => new Map<string, TRow>())
  /** Rows by absolute index in the current result set, to know a page's rows. */
  const [byIndex] = useState(() => new Map<number, TRow>())
  const criteriaRef = useRef(criteria)
  useEffect(() => {
    criteriaRef.current = criteria
  })

  const datasource = useMemo<IServerSideDatasource<TRow>>(
    () => ({
      getRows: async (params) => {
        const { startRow = 0, endRow = pageSize, sortModel } = params.request
        // Sort comes from the grid (it is the source of truth for header clicks).
        const sort = sortModel.map((s) => ({ colId: s.colId, direction: s.sort }))
        const sent = queryKey(criteriaRef.current, sort)
        try {
          const result = await fetchRows(
            toQuery({ ...criteriaRef.current, sort }, { startRow, endRow }),
            new AbortController().signal,
          )
          // A newer search/sort may have started meanwhile. Its rows must not leak into the page
          // index or total, or "select page" would pick ids that are not on screen.
          const stale = sent !== queryKey(criteriaRef.current, readSort(params.api))
          result.rows.forEach((r, i) => {
            seen.set(config.getRowId(r), r)
            if (!stale) byIndex.set(startRow + i, r)
          })
          if (!stale) setTotal(result.total)
          params.success({ rowData: result.rows, rowCount: result.total })
        } catch {
          params.fail()
        }
      },
    }),
    [fetchRows, config, pageSize, seen, byIndex],
  )

  /** Drops cached rows and refetches the current page (after an action). */
  const refresh = useCallback(() => {
    byIndex.clear()
    api?.refreshServerSide({ purge: true })
  }, [api, byIndex])

  // Sort: grid -> criteria (header click) and criteria -> grid (undo, views).
  const sortKey = JSON.stringify(criteria.sort)
  const readGridSort = useCallback(() => readSort(api), [api])
  useEffect(() => {
    if (!api || JSON.stringify(readGridSort()) === sortKey) return
    byIndex.clear()
    api.applyColumnState({
      state: criteria.sort.map((s, i) => ({ colId: s.colId, sort: s.direction, sortIndex: i })),
      defaultState: { sort: null },
    })
  }, [api, sortKey, criteria.sort, readGridSort, byIndex])

  const onSortChanged = useCallback(() => {
    byIndex.clear()
    const next = readGridSort()
    if (JSON.stringify(next) !== sortKey) dispatch({ type: 'setSort', sort: next })
  }, [byIndex, readGridSort, sortKey, dispatch])

  /** Search or filters changed: back to the first page, and `onChange` (e.g. clear the selection). */
  const lastKey = useRef(filtersKey(criteria))
  const key = filtersKey(criteria)
  const reloadFromStart = useCallback(
    (onChange: () => void) => {
      if (!api || lastKey.current === key) return
      lastKey.current = key
      onChange()
      byIndex.clear()
      api.paginationGoToFirstPage()
      api.refreshServerSide({ purge: true })
    },
    [api, key, byIndex],
  )

  return { datasource, total, seen, byIndex, refresh, onSortChanged, reloadFromStart }
}
