import type {
  FieldMap,
  SavedView,
  SearchCriteria,
  ViewStorage,
} from '../types.ts'
import { criteriaEqual } from './criteria.ts'

/**
 * Applies a saved view to a page. Filters on fields the page no longer has
 * are dropped and reported, instead of breaking the page.
 */
export const criteriaFromView = <TFields extends FieldMap>(
  view: SavedView<TFields>,
  knownFields: readonly string[],
  /** Sort to keep when the view does not save one. */
  currentSort: SearchCriteria<TFields>['sort'] = [],
): { criteria: SearchCriteria<TFields>; dropped: string[] } => {
  const known = new Set(knownFields)
  const filters: Record<string, unknown> = {}
  const dropped: string[] = []
  for (const [id, value] of Object.entries(view.criteria.filters)) {
    if (known.has(id)) filters[id] = value
    else dropped.push(id)
  }
  return {
    criteria: {
      search: view.criteria.search,
      filters: filters as SearchCriteria<TFields>['filters'],
      sort: view.sort ?? currentSort,
    },
    dropped,
  }
}

/** The orange dot: current filters (and sort, if the view saves it) differ from the view. */
export const isViewDirty = <TFields extends FieldMap>(
  view: SavedView<TFields>,
  current: SearchCriteria<TFields>,
) =>
  !criteriaEqual(view.criteria, { search: current.search, filters: current.filters }) ||
  (view.sort !== undefined && !criteriaEqual(view.sort, current.sort))

export const ALL_VIEW_ID = '__all'

/** The implicit "no filters" view every page has. */
export const allItemsView = <TFields extends FieldMap>(
  schemaVersion: number,
): SavedView<TFields> => ({
  id: ALL_VIEW_ID,
  name: 'All items',
  isDefault: false,
  schemaVersion,
  criteria: { search: '', filters: {} },
})

/** Shipped views first, then the user's own. */
export const availableViews = <TFields extends FieldMap>(
  shipped: readonly SavedView<TFields>[],
  user: readonly SavedView<TFields>[],
  schemaVersion: number,
): SavedView<TFields>[] => [
  ...(shipped.some((v) => v.id === ALL_VIEW_ID) ? [] : [allItemsView<TFields>(schemaVersion)]),
  ...shipped,
  ...user,
]

/** The user's choice wins, then the page's shipped default, then "All items". */
export const resolveDefaultView = <TFields extends FieldMap>(
  views: readonly SavedView<TFields>[],
  defaultId: string | null,
): SavedView<TFields> =>
  views.find((v) => v.id === defaultId) ??
  views.find((v) => v.isDefault) ??
  views.find((v) => v.id === ALL_VIEW_ID) ??
  views[0]!

/** Browser storage; same interface a backend implementation will have. */
export const localStorageViewStorage = <TFields extends FieldMap>(
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): ViewStorage<TFields> => {
  const key = (pageId: string) => `search-views:${pageId}`
  const defaultKey = (pageId: string) => `search-views-default:${pageId}`
  const read = (pageId: string): SavedView<TFields>[] => {
    try {
      return JSON.parse(storage.getItem(key(pageId)) ?? '[]')
    } catch {
      return []
    }
  }
  const write = (pageId: string, views: SavedView<TFields>[]) =>
    storage.setItem(key(pageId), JSON.stringify(views))

  return {
    list: async (pageId) => read(pageId),
    // Saving an existing id replaces it in place, so the list order is stable.
    save: async (pageId, view) => {
      const views = read(pageId)
      write(
        pageId,
        views.some((v) => v.id === view.id)
          ? views.map((v) => (v.id === view.id ? view : v))
          : [...views, view],
      )
    },
    remove: async (pageId, viewId) => {
      write(pageId, read(pageId).filter((v) => v.id !== viewId))
      if (storage.getItem(defaultKey(pageId)) === viewId) storage.setItem(defaultKey(pageId), '')
    },
    getDefaultId: async (pageId) => storage.getItem(defaultKey(pageId)) || null,
    setDefaultId: async (pageId, viewId) => storage.setItem(defaultKey(pageId), viewId ?? ''),
  }
}
