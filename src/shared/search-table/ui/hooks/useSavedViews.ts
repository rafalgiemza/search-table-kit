import type { GridApi } from 'ag-grid-community'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toQuery } from '../../core/criteria.ts'
import type { SearchAction } from '../../core/search-state.ts'
import {
  availableViews,
  criteriaFromView,
  isViewDirty,
  resolveDefaultView,
  snapshotView,
} from '../../core/views.ts'
import type {
  FetchRows,
  FieldMap,
  SavedView,
  SearchCriteria,
  SearchPageConfig,
  ViewStorage,
} from '../../types.ts'
import { applyLayout, captureLayout } from '../layout.ts'
import type { Notice } from './useNotice.ts'

/** What the page opens with, loaded from storage before the table mounts. */
export type Initial<TFields extends FieldMap> = {
  userViews: SavedView<TFields>[]
  defaultId: string | null
  activeId: string
  criteria: SearchCriteria<TFields>
  layout?: SavedView<TFields>['layout']
}

/** Saved views of one page: list, active/dirty state, persistence and applying a view. */
export function useSavedViews<TRow, TFields extends FieldMap>({
  config,
  storage,
  initial,
  criteria,
  dispatch,
  api,
  fetchRows,
  fetchViewCount,
  clearSelection,
  say,
}: {
  config: SearchPageConfig<TRow, TFields>
  storage: ViewStorage<TFields>
  initial: Initial<TFields>
  criteria: SearchCriteria<TFields>
  dispatch: (action: SearchAction<TFields>) => void
  api: GridApi<TRow> | undefined
  fetchRows: FetchRows<TRow, TFields>
  fetchViewCount?: (view: SavedView<TFields>) => Promise<number>
  clearSelection: () => void
  say: (text: string, action?: Notice['action']) => void
}) {
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

  const loadView = (view: SavedView<TFields>, notice?: Notice['text']) => {
    const { criteria: next, dropped } = criteriaFromView(view, knownFields, criteria.sort)
    dispatch({ type: 'load', criteria: next, label: view.name })
    setActiveId(view.id)
    clearSelection()
    if (view.layout && api) applyLayout(api, view.layout)
    if (dropped.length > 0) {
      say(`Dropped filters that no longer exist: ${dropped.join(', ')}`)
    } else if (notice) {
      say(notice, { label: 'Undo', run: () => dispatch({ type: 'undo' }) })
    }
  }

  const snapshot = (id: string, name: string, withLayout: boolean) =>
    snapshotView(
      criteria,
      { id, name, schemaVersion },
      withLayout,
      api ? captureLayout(api) : undefined,
    )

  const saveNew = async (name: string, withLayout: boolean) => {
    const view = snapshot(crypto.randomUUID(), name, withLayout)
    await storage.save(config.id, view)
    setUserViews((v) => [...v, view])
    setActiveId(view.id)
    say(`Saved view “${name}”`)
  }

  const update = async (withLayout: boolean) => {
    const view = snapshot(activeView.id, activeView.name, withLayout)
    await storage.save(config.id, view)
    setUserViews((list) => list.map((v) => (v.id === view.id ? view : v)))
    say(`Updated “${view.name}”`)
  }

  const remove = async (id: string) => {
    await storage.remove(config.id, id)
    setUserViews((list) => list.filter((v) => v.id !== id))
    if (userDefaultId === id) setUserDefaultId(null)
    if (activeId === id) loadView(resolveDefaultView(views.filter((v) => v.id !== id), null))
  }

  const makeDefault = async (id: string) => {
    await storage.setDefaultId(config.id, id)
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

  return {
    views,
    activeView,
    defaultId,
    dirty,
    ownIds,
    counts,
    loadView,
    loadCounts,
    saveNew,
    update,
    remove,
    makeDefault,
  }
}
