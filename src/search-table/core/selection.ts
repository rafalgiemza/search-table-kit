import type { FieldMap, SearchCriteria, Selection, SelectionPolicy } from '../types.ts'
import { withPredicate } from './criteria.ts'

/**
 * `ids`: explicit rows. `all`: "everything matching `criteria`" minus
 * `excluded`; the criteria snapshot is taken when the user chose it, so
 * later filter changes cannot silently widen or shrink the selection.
 */
export type SelectionState<TFields extends FieldMap> =
  | { kind: 'ids'; ids: ReadonlySet<string> }
  | {
      kind: 'all'
      criteria: SearchCriteria<TFields>
      excluded: ReadonlySet<string>
    }

export const emptySelection = <TFields extends FieldMap>(): SelectionState<TFields> => ({
  kind: 'ids',
  ids: new Set(),
})

export const isSelected = <TFields extends FieldMap>(
  state: SelectionState<TFields>,
  id: string,
) => (state.kind === 'ids' ? state.ids.has(id) : !state.excluded.has(id))

const toggleIn = (set: ReadonlySet<string>, id: string, on: boolean) => {
  const next = new Set(set)
  if (on) next.add(id)
  else next.delete(id)
  return next
}

export const setRowSelected = <TFields extends FieldMap>(
  state: SelectionState<TFields>,
  id: string,
  selected: boolean,
): SelectionState<TFields> =>
  state.kind === 'ids'
    ? { ...state, ids: toggleIn(state.ids, id, selected) }
    : { ...state, excluded: toggleIn(state.excluded, id, !selected) }

/** Header checkbox: selects (or clears) the given page of rows. */
export const setPageSelected = <TFields extends FieldMap>(
  state: SelectionState<TFields>,
  pageIds: readonly string[],
  selected: boolean,
): SelectionState<TFields> =>
  pageIds.reduce((acc, id) => setRowSelected(acc, id, selected), state)

/** "Select all N matching" - snapshot of the current criteria, predicate applied. */
export const selectAllMatching = <TFields extends FieldMap, TRow>(
  criteria: SearchCriteria<TFields>,
  policy?: SelectionPolicy<TRow, TFields>,
): SelectionState<TFields> => ({
  kind: 'all',
  criteria: withPredicate(criteria, policy?.criteriaPredicate),
  excluded: new Set(),
})

export const selectedCount = <TFields extends FieldMap>(
  state: SelectionState<TFields>,
  totalMatching: number,
) =>
  state.kind === 'ids' ? state.ids.size : Math.max(0, totalMatching - state.excluded.size)

/** The shape handed to `runAction`. */
export const toSelection = <TFields extends FieldMap>(
  state: SelectionState<TFields>,
): Selection<TFields> =>
  state.kind === 'ids'
    ? { mode: 'ids', ids: [...state.ids] }
    : { mode: 'criteria', criteria: state.criteria, excludedIds: [...state.excluded] }

/**
 * What the UI can say about rows an action will skip. `rows` is only the loaded
 * part of a selection ("all matching" has none, scrolled-out rows may be gone),
 * so `skipped` is a lower bound unless `complete`; the backend has the final say.
 */
export const skipEstimate = <TRow>(
  rows: readonly TRow[],
  count: number,
  isApplicable: (row: TRow) => boolean,
): { skipped: number; complete: boolean } => ({
  skipped: rows.filter((r) => !isApplicable(r)).length,
  complete: rows.length >= count,
})
