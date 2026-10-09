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
      sort: view.sort ?? [],
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

/** Browser storage; same interface a backend implementation will have. */
export const localStorageViewStorage = <TFields extends FieldMap>(
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): ViewStorage<TFields> => {
  const key = (pageId: string) => `search-views:${pageId}`
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
    save: async (pageId, view) => {
      const others = read(pageId).filter((v) => v.id !== view.id)
      // Only one default per page.
      const normalised = view.isDefault
        ? others.map((v) => ({ ...v, isDefault: false }))
        : others
      write(pageId, [...normalised, view])
    },
    remove: async (pageId, viewId) =>
      write(pageId, read(pageId).filter((v) => v.id !== viewId)),
  }
}
