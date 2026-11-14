import type { GridApi } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useSearchState } from './useSearchState.ts'
import { availableViews, criteriaFromView, localStorageViewStorage, resolveDefaultView } from '../core/views.ts'
import { selectAllMatching, setRowSelected, toSelection, isSelected } from '../core/selection.ts'
import type { FieldMap, SavedView, SearchTableProps, ViewStorage } from '../types.ts'
import { ActionIsland } from './ActionIsland.tsx'
import { gridTheme } from './ag-setup.ts'
import { buildColumnDefs } from './columns.ts'
import { buildContextMenu } from './context-menu.ts'
import { FilterBar } from './FilterBar.tsx'
import { useBulkActions } from './hooks/useBulkActions.ts'
import { useNotice } from './hooks/useNotice.ts'
import { useSavedViews, type Initial } from './hooks/useSavedViews.ts'
import { useServerData } from './hooks/useServerData.ts'
import { useStableGridContext } from './hooks/useStableGridContext.ts'
import { SELECT_ALL_MATCHING, useTableSelection } from './hooks/useTableSelection.ts'
import { SavedViews } from './SavedViews.tsx'
import { NoRows, type GridContext } from './selection-column.tsx'
import { LinkButton } from './styles.ts'

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding: 16px 20px;
  position: relative;
`
const PageHead = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  & h1 { font-size: 18px; font-weight: 600; margin: 0; }
`
const Banner = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
`
/** The grid takes everything that is left. */
const GridArea = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;

  & > div:first-child { height: 100%; }

  /* Header filter icon for columns with an active filter (class set via the column's headerClass). */
  & .has-filter .ag-header-cell-text::after { content: ' ⏷'; color: var(--accent); }
`
/** Backdrop for page slots; the slot's own root becomes the dialog card. */
const Modal = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);

  & > * {
    min-width: 420px;
    max-width: 640px;
    max-height: 80vh;
    overflow: auto;
    padding: 18px;
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    position: static;
  }
  & h2 { margin: 0 0 12px; font-size: 16px; }
  & ul { list-style: none; margin: 0 0 12px; padding: 0; }
  & li { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; }
  & footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
`
const Toast = styled.div`
  position: fixed;
  z-index: 60;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  padding: 10px 16px;
  background: var(--panel-2);
  border: 1px solid var(--accent);
  border-radius: 8px;
`

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
  const [api, setApi] = useState<GridApi<TRow>>()
  const [modelTick, setModelTick] = useState(0)
  const [details, setDetails] = useState<readonly TRow[] | null>(null)
  const { notice, say, dismiss } = useNotice()

  const pageSizes = config.pageSizes ?? [25, 50, 100]
  const pageSize = config.defaultPageSize ?? 50
  const actions = config.actions ?? []

  const data = useServerData({ config, fetchRows, criteria, dispatch, api, pageSize })
  const sel = useTableSelection({
    config,
    api,
    criteria,
    fetchRows,
    total: data.total,
    seen: data.seen,
    byIndex: data.byIndex,
    modelTick,
  })
  const { selection, selectedRows, count, selectMode } = sel

  useEffect(() => data.reloadFromStart(sel.clearSelection))

  const views = useSavedViews({
    config,
    storage: viewStorage,
    initial,
    criteria,
    dispatch,
    api,
    fetchRows,
    fetchViewCount,
    clearSelection: sel.clearSelection,
    say,
  })

  const bulk = useBulkActions<TRow, TFields>({
    runAction,
    selection,
    setSelection: sel.setSelection,
    count,
    say,
    refresh: data.refresh,
  })

  const clearAll = () => {
    dispatch({ type: 'clearFilters' })
    say('Filters cleared', { label: 'Undo', run: () => dispatch({ type: 'undo' }) })
  }

  const context = useStableGridContext({
    isSelected: (id) => isSelected(selection, id),
    isSelectable: (row) => sel.isSelectable(row as TRow),
    getRowId: (row) => config.getRowId(row as TRow),
    toggle: sel.toggle,
    togglePage: sel.togglePage,
    pageState: sel.pageState,
    activeFilters: new Set(Object.keys(criteria.filters)),
    hasFilters: Object.keys(criteria.filters).length > 0,
    clearAll,
  } satisfies GridContext)

  const columnDefs = useMemo(
    () => buildColumnDefs(config.columns, selectMode),
    [config.columns, selectMode],
  )

  const skippedFor = (a: (typeof actions)[number]) =>
    a.isApplicable ? selectedRows.filter((r) => !a.isApplicable!(r)) : []

  const ext = config.extensions
  const Bar = ext?.SelectionBar
  const { dialogAction } = bulk

  return (
    <Page>
      <PageHead>
        <h1>{config.title}</h1>
        <SavedViews
          views={views.views}
          activeId={views.activeView.id}
          defaultId={views.defaultId}
          dirty={views.dirty}
          ownIds={views.ownIds}
          counts={views.counts}
          onOpen={views.loadCounts}
          onSelect={(id) => views.loadView(views.views.find((v) => v.id === id)!)}
          onSaveNew={(name, withLayout) => void views.saveNew(name, withLayout)}
          onUpdate={(withLayout) => void views.update(withLayout)}
          onDelete={(id) => void views.remove(id)}
          onSetDefault={(id) => void views.makeDefault(id)}
          onReset={() => views.loadView(views.activeView, `Reset to “${views.activeView.name}”`)}
        />
      </PageHead>

      <FilterBar config={config} criteria={criteria} dispatch={dispatch} onClearAll={clearAll} />

      {/* Offered only once the real size is known; the view's total ignores the page's selection predicate. */}
      {SELECT_ALL_MATCHING &&
        selectMode === 'multiple' &&
        selection.kind === 'ids' &&
        sel.pageAll &&
        sel.matching !== undefined &&
        sel.matching > sel.pageCount && (
          <Banner>
            All {sel.pageCount} items on this page are selected.
            <LinkButton
              type="button"
              onClick={() => sel.setSelection(selectAllMatching(criteria, sel.policy))}
            >
              Select all {sel.matching} matching
            </LinkButton>
          </Banner>
        )}
      {selection.kind === 'all' && (
        <Banner>
          {count === null ? 'All matching items are selected.' : `All ${count} matching items are selected.`}
          <LinkButton type="button" onClick={sel.clearSelection}>
            Clear selection
          </LinkButton>
        </Banner>
      )}

      <GridArea>
        <AgGridReact<TRow>
          theme={gridTheme}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
          rowModelType="serverSide"
          serverSideDatasource={data.datasource}
          pagination
          paginationPageSize={pageSize}
          paginationPageSizeSelector={[...pageSizes]}
          cacheBlockSize={pageSize}
          getRowId={(p) => config.getRowId(p.data)}
          context={context}
          noRowsOverlayComponent={NoRows}
          getContextMenuItems={(params) =>
            buildContextMenu({
              params,
              config,
              selection,
              selectedRows,
              selectMode,
              isSelectable: sel.isSelectable,
              busy: bulk.busy,
              count,
              startFromMenu: bulk.startFromMenu,
              openDetails: setDetails,
            })
          }
          onGridReady={(e) => setApi(e.api)}
          onModelUpdated={() => setModelTick((t) => t + 1)}
          onSortChanged={data.onSortChanged}
        />

        {(count === null || count > 0) &&
          (Bar ? (
            <Bar selection={toSelection(selection)} selectedRows={selectedRows} clear={sel.clearSelection} />
          ) : (
            <ActionIsland
              count={count}
              actions={actions}
              rows={selectedRows}
              busy={bulk.busy}
              confirming={bulk.confirming}
              onConfirming={bulk.setConfirming}
              countFailed={sel.matchingFailed}
              onDeselect={sel.clearSelection}
              onRun={bulk.run}
              onOpenDialog={bulk.setDialogAction}
            />
          ))}
      </GridArea>

      {dialogAction?.confirm.type === 'dialog' && (
        <Modal>
          <dialogAction.confirm.Dialog
            rows={selectedRows}
            skippedRows={skippedFor(dialogAction)}
            count={count ?? 0}
            selection={toSelection(selection)}
            onRemoveRow={(id) => sel.setSelection((s) => setRowSelected(s, id, false))}
            onConfirm={(payload) => void bulk.run(dialogAction, payload)}
            onCancel={() => bulk.setDialogAction(null)}
          />
        </Modal>
      )}

      {details && ext?.DetailsDialog && (
        <Modal>
          <ext.DetailsDialog rows={details} onClose={() => setDetails(null)} />
        </Modal>
      )}

      {notice && (
        <Toast role="status">
          {notice.text}
          {notice.action && (
            <LinkButton
              type="button"
              onClick={() => {
                notice.action!.run()
                dismiss()
              }}
            >
              {notice.action.label}
            </LinkButton>
          )}
        </Toast>
      )}
    </Page>
  )
}
