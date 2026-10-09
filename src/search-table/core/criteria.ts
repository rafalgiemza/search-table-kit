import type {
  FieldId,
  FieldMap,
  FilterKinds,
  FilterState,
  SearchCriteria,
  SearchQuery,
} from '../types.ts'
import { resolveQuickRange } from './dates.ts'

export const emptyCriteria = <TFields extends FieldMap>(): SearchCriteria<TFields> => ({
  search: '',
  filters: {},
  sort: [],
})

export const setFilter = <TFields extends FieldMap, Id extends FieldId<TFields>>(
  criteria: SearchCriteria<TFields>,
  id: Id,
  value: FilterKinds[TFields[Id]],
): SearchCriteria<TFields> => ({
  ...criteria,
  filters: { ...criteria.filters, [id]: value },
})

export const removeFilter = <TFields extends FieldMap>(
  criteria: SearchCriteria<TFields>,
  id: FieldId<TFields>,
): SearchCriteria<TFields> => {
  const { [id]: _removed, ...rest } = criteria.filters
  return { ...criteria, filters: rest as FilterState<TFields> }
}

/** Drops every filter; the search text and the sort are kept. */
export const clearFilters = <TFields extends FieldMap>(
  criteria: SearchCriteria<TFields>,
): SearchCriteria<TFields> => ({ ...criteria, filters: {} })

export const activeFilterIds = <TFields extends FieldMap>(
  criteria: SearchCriteria<TFields>,
) => Object.keys(criteria.filters) as FieldId<TFields>[]

/** Stable structural equality (key order does not matter). */
export const criteriaEqual = (a: unknown, b: unknown): boolean =>
  stableStringify(a) === stableStringify(b)

const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)))
      : v,
  )

/** Turns symbolic ("last 30 days") date filters into concrete ranges. */
export const resolveRelativeDates = <TFields extends FieldMap>(
  filters: FilterState<TFields>,
  today: Date,
): FilterState<TFields> => {
  const out: Record<string, unknown> = {}
  for (const [id, value] of Object.entries(filters)) {
    const v = value as { condition?: string; range?: never }
    out[id] = v.condition === 'quick' ? resolveQuickRange(v.range!, today) : value
  }
  return out as FilterState<TFields>
}

/**
 * AND-s a page's fixed predicate (e.g. only `done` rows are selectable) into
 * user criteria. Two "in" lists intersect; otherwise the predicate wins.
 */
export const withPredicate = <TFields extends FieldMap>(
  criteria: SearchCriteria<TFields>,
  predicate: FilterState<TFields> | undefined,
): SearchCriteria<TFields> => {
  if (!predicate) return criteria
  const filters: Record<string, unknown> = { ...criteria.filters }
  for (const [id, wanted] of Object.entries(predicate)) {
    const current = filters[id] as { condition?: string; values?: string[] } | undefined
    const w = wanted as { condition?: string; values?: string[] }
    filters[id] =
      current?.condition === 'in' && w.condition === 'in' && current.values && w.values
        ? { ...current, values: current.values.filter((x) => w.values!.includes(x)) }
        : wanted
  }
  return { ...criteria, filters: filters as FilterState<TFields> }
}

/** Builds what goes over the wire: relative dates resolved, plus the row window. */
export const toQuery = <TFields extends FieldMap>(
  criteria: SearchCriteria<TFields>,
  window: { startRow: number; endRow: number },
  today: Date = new Date(),
): SearchQuery<TFields> => ({
  ...criteria,
  filters: resolveRelativeDates(criteria.filters, today),
  ...window,
})
