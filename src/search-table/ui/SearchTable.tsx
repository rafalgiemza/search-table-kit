import type {
  ColDef,
  DefaultMenuItem,
  GetContextMenuItemsParams,
  GridApi,
  IServerSideDatasource,
  MenuItemDef,
} from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toQuery, withPredicate } from '../core/criteria.ts'
import { useSearchState } from '../core/search-state.ts'
import {
  availableViews,
  criteriaFromView,
  isViewDirty,
  localStorageViewStorage,
  resolveDefaultView,
} from '../core/views.ts'
import {
  emptySelection,
  isSelected,
  selectAllMatching,
  selectedCount,
  selectionDiffersFromView,
  setPageSelected,
  setRowSelected,
  toSelection,
  type SelectionState,
} from '../core/selection.ts'
import type {
  AnyBulkAction,
  FieldMap,
  SavedView,
  SearchCriteria,
  SearchTableProps,
  ViewStorage,
} from '../types.ts'
import { ActionIsland } from './ActionIsland.tsx'
import { gridTheme } from './ag-setup.ts'
import { FilterBar } from './FilterBar.tsx'
import { applyLayout, captureLayout } from './layout.ts'
import { SavedViews } from './SavedViews.tsx'
import {
  NoRows,
  SELECT_COL_ID,
  SelectCell,
  SelectHeader,
  type GridContext,
} from './selection-column.tsx'
import './search-table.css'

/** Number of rows matching `criteria`, via a zero-row query. */
function useMatchingCount<TRow, TFields extends FieldMap>(
  criteria: SearchCriteria<TFields>,
  fetchRows: SearchTableProps<TRow, TFields>['fetchRows'],
  enabled: boolean,
) {
  const key = JSON.stringify(criteria)
  const [result, setResult] = useState<{ key: string; total: number }>()
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    fetchRows(toQuery(JSON.parse(key), { startRow: 0, endRow: 0 }), controller.signal)
      .then((r) => setResult({ key, total: r.total }))
      .catch(() => undefined)
    return () => controller.abort()
  }, [key, enabled, fetchRows])
  return result?.key === key ? result.total : undefined
}

type Notice = { text: string; action?: { label: string; run: () => void } }

type Initial<TFields extends FieldMap> = {
  userViews: SavedView<TFields>[]
  defaultId: string | null
  activeId: string
  criteria: SearchCriteria<TFields>
  layout?: SavedView<TFields>['layout']
}

/** Loads saved views first, so the page opens straight on its default view. */
export function SearchTable<TRow, TFields extends FieldMap>(
  props: SearchTableProps<TRow, TFields>,
) {
  const { config } = props
  const storage = useMemo<ViewStorage<TFields>>(
    () => props.viewStorage ?? localStorageViewStorage<TFields>(),
    [props.viewStorage],
  )
  const [initial, setInitial] = useState<Initial<TFields>>()

  useEffect(() => {
    let cancelled = false
    void Promise.all([storage.list(config.id), storage.getDefaultId(config.id)])
      .catch(() => [[], null] as [SavedView<TFields>[], string | null])
      .then(([userViews, defaultId]) => {
        if (cancelled) return
        const views = availableViews(config.defaultViews ?? [], userViews, config.viewsSchemaVersion ?? 1)
        const view = resolveDefaultView(views, defaultId)
        const { criteria } = criteriaFromView(view, Object.keys(config.fields))
        setInitial({ userViews, defaultId, activeId: view.id, criteria, layout: view.layout })
      })
    return () => {
      cancelled = true
    }
  }, [storage, config])

  return initial ? <SearchTableInner {...props} viewStorage={storage} initial={initial} /> : null
}

function SearchTableInner<TRow, TFields extends FieldMap>({
  config,
  fetchRows,
  runAction,
  fetchViewCount,
  viewStorage,
  initial,
}: SearchTableProps<TRow, TFields> & {
  viewStorage: ViewStorage<TFields>
  initial: Initial<TFields>
}) {
  const { criteria, dispatch } = useSearchState<TFields>(initial.criteria)
  const [selection, setSelection] = useState<SelectionState<TFields>>(emptySelection)
  const [api, setApi] = useState<GridApi<TRow>>()
  const [total, setTotal] = useState(0)
  const [modelTick, setModelTick] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogAction, setDialogAction] = useState<AnyBulkAction<TRow, TFields> | null>(null)
  const [details, setDetails] = useState<readonly TRow[] | null>(null)

  /* --------------------------- saved views --------------------------------- */

  const schemaVersion = config.viewsSchemaVersion ?? 1
  const knownFields = useMemo(() => Object.keys(config.fields), [config.fields])
  const [userViews, setUserViews] = useState(initial.userViews)
  const [userDefaultId, setUserDefaultId] = useState(initial.defaultId)
  const [activeId, setActiveId] = useState(initial.activeId)
  const [counts, setCounts] = useState<Record<string, number | undefined>>({})
  const views = useMemo(
    () => availableViews(config.defaultViews ?? [], userViews, schemaVersion),
    [config.defaultViews, userViews, schemaVersion],
  )
  const defaultId = resolveDefaultView(views, userDefaultId).id
  const activeView = views.find((v) => v.id === activeId) ?? views[0]!
  const dirty = isViewDirty(activeView, criteria)
  const ownIds = useMemo(() => new Set(userViews.map((v) => v.id)), [userViews])

  const actions = config.actions ?? []
  const policy = config.selection
  const selectMode = policy?.mode ?? (actions.length > 0 ? 'multiple' : 'none')
  const pageSizes = config.pageSizes ?? [25, 50, 100]
  const pageSize = config.defaultPageSize ?? 50

  /** Rows seen so far, so selected ids can be shown and checked against rules. */
  const [seen] = useState(() => new Map<string, TRow>())
  /** Rows by absolute index in the current result set, to know a page's rows. */
  const [byIndex] = useState(() => new Map<number, TRow>())
  const criteriaRef = useRef(criteria)
  useEffect(() => {
    criteriaRef.current = criteria
  })

  /* ------------------------------ data ------------------------------------ */

  const datasource = useMemo<IServerSideDatasource<TRow>>(
    () => ({
      getRows: async (params) => {
        const { startRow = 0, endRow = pageSize, sortModel } = params.request
        // Sort comes from the grid (it is the source of truth for header clicks).
        const sort = sortModel.map((s) => ({ colId: s.colId, direction: s.sort }))
        try {
          const result = await fetchRows(
            toQuery({ ...criteriaRef.current, sort }, { startRow, endRow }),
            new AbortController().signal,
          )
          result.rows.forEach((r, i) => {
            seen.set(config.getRowId(r), r)
            byIndex.set(startRow + i, r)
          })
          setTotal(result.total)
          params.success({ rowData: result.rows, rowCount: result.total })
        } catch {
          params.fail()
        }
      },
    }),
    [fetchRows, config, pageSize, seen, byIndex],
  )

  // Filters or search changed: reload from the first page.
  const filtersKey = JSON.stringify({ s: criteria.search, f: criteria.filters })
  const lastKey = useRef(filtersKey)
  useEffect(() => {
    if (!api || lastKey.current === filtersKey) return
    lastKey.current = filtersKey
    byIndex.clear()
    api.paginationGoToFirstPage()
    api.refreshServerSide({ purge: true })
  }, [api, filtersKey, byIndex])

  // Sort: grid -> criteria (header click) and criteria -> grid (undo, views).
  const sortKey = JSON.stringify(criteria.sort)
  const readGridSort = useCallback(
    () =>
      (api?.getColumnState() ?? [])
        .filter((c) => c.sort)
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        .map((c) => ({ colId: c.colId, direction: c.sort! })),
    [api],
  )
  useEffect(() => {
    if (!api || JSON.stringify(readGridSort()) === sortKey) return
    byIndex.clear()
    api.applyColumnState({
      state: criteria.sort.map((s, i) => ({ colId: s.colId, sort: s.direction, sortIndex: i })),
      defaultState: { sort: null },
    })
  }, [api, sortKey, criteria.sort, readGridSort, byIndex])

  /* ---------------------------- selection --------------------------------- */

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
    (row: TRow) => selectMode !== 'none' && (policy?.isSelectable?.(row) ?? true),
    [selectMode, policy],
  )

  const pageState = useCallback((): 'none' | 'some' | 'all' => {
    const rows = pageRows().filter(isSelectable)
    const picked = rows.filter((r) => isSelected(selection, config.getRowId(r))).length
    return picked === 0 ? 'none' : picked === rows.length ? 'all' : 'some'
  }, [pageRows, isSelectable, selection, config])

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

  const togglePage = (on: boolean) =>
    setSelection((s) =>
      setPageSelected(
        s,
        pageRows().filter(isSelectable).map(config.getRowId),
        on,
      ),
    )

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
    () => withPredicate(criteria, policy?.criteriaPredicate),
    [criteria, policy],
  )
  const matching = useMatchingCount(
    selection.kind === 'all' ? selection.criteria : matchingCriteria,
    fetchRows,
    selectMode !== 'none' && (selection.kind === 'all' || pageAll),
  )
  const count = selection.kind === 'all' ? selectedCount(selection, matching ?? total) : selectedCount(selection, total)

  /* ------------------------------ actions --------------------------------- */

  const say = (text: string, action?: Notice['action']) => {
    setNotice({ text, action })
  }
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const loadView = (view: SavedView<TFields>, notice?: Notice['text']) => {
    const { criteria: next, dropped } = criteriaFromView(view, knownFields, criteria.sort)
    dispatch({ type: 'load', criteria: next, label: view.name })
    setActiveId(view.id)
    setSelection(emptySelection())
    if (view.layout && api) applyLayout(api, view.layout)
    if (dropped.length > 0) {
      say(`Dropped filters that no longer exist: ${dropped.join(', ')}`)
    } else if (notice) {
      say(notice, { label: 'Undo', run: () => dispatch({ type: 'undo' }) })
    }
  }

  const snapshot = (id: string, name: string, withLayout: boolean): SavedView<TFields> => ({
    id,
    name,
    isDefault: false,
    schemaVersion,
    criteria: { search: criteria.search, filters: criteria.filters },
    sort: withLayout ? criteria.sort : undefined,
    layout: withLayout && api ? captureLayout(api) : undefined,
  })

  const saveNewView = async (name: string, withLayout: boolean) => {
    const view = snapshot(crypto.randomUUID(), name, withLayout)
    await viewStorage.save(config.id, view)
    setUserViews((v) => [...v, view])
    setActiveId(view.id)
    say(`Saved view “${name}”`)
  }

  const updateView = async (withLayout: boolean) => {
    const view = snapshot(activeView.id, activeView.name, withLayout)
    await viewStorage.save(config.id, view)
    setUserViews((list) => list.map((v) => (v.id === view.id ? view : v)))
    say(`Updated “${view.name}”`)
  }

  const deleteView = async (id: string) => {
    await viewStorage.remove(config.id, id)
    setUserViews((list) => list.filter((v) => v.id !== id))
    if (userDefaultId === id) setUserDefaultId(null)
    if (activeId === id) loadView(resolveDefaultView(views.filter((v) => v.id !== id), null))
  }

  const makeDefault = async (id: string) => {
    await viewStorage.setDefaultId(config.id, id)
    setUserDefaultId(id)
    say(`“${views.find((v) => v.id === id)?.name}” opens first from now on`)
  }

  /** Counts are loaded when the dropdown opens, one zero-row query per view. */
  const loadCounts = () => {
    for (const view of views) {
      const count =
        fetchViewCount?.(view) ??
        fetchRows(
          toQuery(criteriaFromView(view, knownFields).criteria, { startRow: 0, endRow: 0 }),
          new AbortController().signal,
        ).then((r) => r.total)
      count.then((n) => setCounts((c) => ({ ...c, [view.id]: n }))).catch(() => undefined)
    }
  }

  // The default view may carry a saved column layout; apply it once the grid is up.
  const layoutApplied = useRef(false)
  useEffect(() => {
    if (!api || layoutApplied.current || !initial.layout) return
    layoutApplied.current = true
    applyLayout(api, initial.layout)
  }, [api, initial.layout])

  const run = async (action: AnyBulkAction<TRow, TFields>, payload?: unknown) => {
    setBusy(true)
    setDialogAction(null)
    try {
      const result = await runAction(action.id, toSelection(selection), payload)
      say(result.message)
      setSelection(emptySelection())
      byIndex.clear()
      api?.refreshServerSide({ purge: true })
    } catch {
      say(`${action.label} failed`)
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    dispatch({ type: 'clearFilters' })
    say('Filters cleared', { label: 'Undo', run: () => dispatch({ type: 'undo' }) })
  }

  /* ------------------------------- grid ----------------------------------- */

  const latest: GridContext = {
    isSelected: (id) => isSelected(selection, id),
    isSelectable: (row) => isSelectable(row as TRow),
    getRowId: (row) => config.getRowId(row as TRow),
    toggle,
    togglePage,
    pageState,
    activeFilters: new Set(Object.keys(criteria.filters)),
    hasFilters: Object.keys(criteria.filters).length > 0,
    clearAll,
  }

  // The grid keeps the context it was given; a stable object that delegates to
  // the latest render means its renderers never act on a stale closure.
  const latestRef = useRef(latest)
  useEffect(() => {
    latestRef.current = latest
  })
  const context = useMemo<GridContext>(
    () => ({
      isSelected: (id) => latestRef.current.isSelected(id),
      isSelectable: (row) => latestRef.current.isSelectable(row),
      getRowId: (row) => latestRef.current.getRowId(row),
      toggle: (id, on) => latestRef.current.toggle(id, on),
      togglePage: (on) => latestRef.current.togglePage(on),
      pageState: () => latestRef.current.pageState(),
      get activeFilters() {
        return latestRef.current.activeFilters
      },
      get hasFilters() {
        return latestRef.current.hasFilters
      },
      clearAll: () => latestRef.current.clearAll(),
    }),
    [],
  )

  const columnDefs = useMemo<ColDef<TRow>[]>(() => {
    const data = config.columns.map(({ filterField, ...col }) => ({
      ...col,
      headerClass: (p: { context: GridContext }) =>
        filterField && p.context.activeFilters.has(filterField) ? 'has-filter' : undefined,
    })) as ColDef<TRow>[]
    return selectMode === 'none'
      ? data
      : [
          {
            colId: SELECT_COL_ID,
            headerComponent: SelectHeader,
            cellRenderer: SelectCell,
            width: 48,
            pinned: 'left',
            sortable: false,
            resizable: false,
            suppressMovable: true,
            lockPosition: 'left',
          },
          ...data,
        ]
  }, [config.columns, selectMode])

  const getContextMenuItems = (
    params: GetContextMenuItemsParams<TRow>,
  ): (MenuItemDef<TRow> | DefaultMenuItem)[] => {
    const node = params.node?.data
    const rows: TRow[] =
      node === undefined
        ? []
        : selection.kind === 'ids' && isSelected(selection, config.getRowId(node))
          ? selectedRows
          : [node]
    const custom: (MenuItemDef<TRow> | DefaultMenuItem)[] =
      rows.length > 0
        ? (config.extensions?.rowMenuItems?.({
            rows,
            selection: toSelection(selection),
            openDetails: setDetails,
          }) ?? [])
        : []
    const standard: DefaultMenuItem[] = ['copy', 'copyWithHeaders', 'paste', 'separator', 'export']
    return custom.length ? [...custom, 'separator', ...standard] : standard
  }

  const skippedFor = (a: AnyBulkAction<TRow, TFields>) =>
    a.isApplicable ? selectedRows.filter((r) => !a.isApplicable!(r)) : []

  const ext = config.extensions
  const Bar = ext?.SelectionBar

  return (
    <section className="search-page">
      <header className="search-page__head">
        <h1>{config.title}</h1>
        <SavedViews
          views={views}
          activeId={activeView.id}
          defaultId={defaultId}
          dirty={dirty}
          ownIds={ownIds}
          counts={counts}
          onOpen={loadCounts}
          onSelect={(id) => loadView(views.find((v) => v.id === id)!)}
          onSaveNew={(name, withLayout) => void saveNewView(name, withLayout)}
          onUpdate={(withLayout) => void updateView(withLayout)}
          onDelete={(id) => void deleteView(id)}
          onSetDefault={(id) => void makeDefault(id)}
          onReset={() => loadView(activeView, `Reset to “${activeView.name}”`)}
        />
      </header>

      <FilterBar
        config={config}
        criteria={criteria}
        dispatch={dispatch}
        onClearAll={clearAll}
      />

      {selectMode === 'multiple' && selection.kind === 'ids' && pageAll && (matching ?? total) > pageCount && (
        <div className="banner">
          All {pageCount} items on this page are selected.
          <button
            type="button"
            className="link"
            onClick={() => setSelection(selectAllMatching(criteria, policy))}
          >
            Select all {matching ?? total} matching
          </button>
        </div>
      )}
      {selection.kind === 'all' && (
        <div className="banner">
          All {count} matching items are selected.
          <button type="button" className="link" onClick={() => setSelection(emptySelection())}>
            Clear selection
          </button>
        </div>
      )}

      <div className="grid-area">
        <AgGridReact<TRow>
          theme={gridTheme}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
          rowModelType="serverSide"
          serverSideDatasource={datasource}
          pagination
          paginationPageSize={pageSize}
          paginationPageSizeSelector={[...pageSizes]}
          cacheBlockSize={pageSize}
          getRowId={(p) => config.getRowId(p.data)}
          context={context}
          noRowsOverlayComponent={NoRows}
          getContextMenuItems={getContextMenuItems}
          onGridReady={(e) => setApi(e.api)}
          onModelUpdated={() => setModelTick((t) => t + 1)}
          onSortChanged={() => {
            byIndex.clear()
            const next = readGridSort()
            if (JSON.stringify(next) !== sortKey) dispatch({ type: 'setSort', sort: next })
          }}
        />

        {count > 0 &&
          (Bar ? (
            <Bar
              selection={toSelection(selection)}
              selectedRows={selectedRows}
              clear={() => setSelection(emptySelection())}
            />
          ) : (
            <ActionIsland
              count={count}
              actions={actions}
              rows={selectedRows}
              busy={busy}
              warning={
                selectionDiffersFromView(selection, matchingCriteria)
                  ? 'Selected under different filters'
                  : undefined
              }
              onDeselect={() => setSelection(emptySelection())}
              onRun={run}
              onOpenDialog={setDialogAction}
            />
          ))}
      </div>

      {dialogAction?.confirm.type === 'dialog' && (
        <div className="modal">
          <dialogAction.confirm.Dialog
            rows={selectedRows}
            skippedRows={skippedFor(dialogAction)}
            selection={toSelection(selection)}
            onRemoveRow={(id) => setSelection((s) => setRowSelected(s, id, false))}
            onConfirm={(payload) => void run(dialogAction, payload)}
            onCancel={() => setDialogAction(null)}
          />
        </div>
      )}

      {details && ext?.DetailsDialog && (
        <div className="modal">
          <ext.DetailsDialog rows={details} onClose={() => setDetails(null)} />
        </div>
      )}

      {notice && (
        <div className="toast" role="status">
          {notice.text}
          {notice.action && (
            <button
              type="button"
              className="link"
              onClick={() => {
                notice.action!.run()
                setNotice(null)
              }}
            >
              {notice.action.label}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
