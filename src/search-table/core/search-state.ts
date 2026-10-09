import { useCallback, useReducer } from 'react'
import type {
  FieldId,
  FieldMap,
  FilterKinds,
  SearchCriteria,
  SortDirection,
} from '../types.ts'
import {
  clearFilters,
  emptyCriteria,
  removeFilter,
  setFilter,
} from './criteria.ts'

export type SearchState<TFields extends FieldMap> = {
  criteria: SearchCriteria<TFields>
  /** Criteria before the last "Clear all" / "Reset", for the undo toast. */
  undo?: { label: string; criteria: SearchCriteria<TFields> }
}

export type SearchAction<TFields extends FieldMap> =
  | { type: 'search'; text: string }
  | {
      type: 'setFilter'
      id: FieldId<TFields>
      value: FilterKinds[TFields[FieldId<TFields>]]
    }
  | { type: 'removeFilter'; id: FieldId<TFields> }
  | { type: 'clearFilters' }
  /** Sets or removes one column's direction, keeping the others (multi-sort). */
  | { type: 'sort'; colId: string; direction: SortDirection | null }
  /** Replaces the whole sort model, e.g. as reported by the grid. */
  | { type: 'setSort'; sort: SearchCriteria<TFields>['sort'] }
  | { type: 'load'; criteria: SearchCriteria<TFields>; label: string }
  | { type: 'undo' }

const remember = <TFields extends FieldMap>(
  state: SearchState<TFields>,
  label: string,
  criteria: SearchCriteria<TFields>,
): SearchState<TFields> => ({
  criteria,
  undo: { label, criteria: state.criteria },
})

export const searchReducer = <TFields extends FieldMap>(
  state: SearchState<TFields>,
  action: SearchAction<TFields>,
): SearchState<TFields> => {
  switch (action.type) {
    case 'search':
      return { criteria: { ...state.criteria, search: action.text } }
    case 'setFilter':
      return { criteria: setFilter(state.criteria, action.id, action.value) }
    case 'removeFilter':
      return { criteria: removeFilter(state.criteria, action.id) }
    case 'clearFilters':
      return remember(state, 'Filters cleared', clearFilters(state.criteria))
    case 'load':
      return remember(state, action.label, action.criteria)
    case 'sort': {
      const { sort } = state.criteria
      const exists = sort.some((s) => s.colId === action.colId)
      const next = !action.direction
        ? sort.filter((s) => s.colId !== action.colId)
        : exists
          ? sort.map((s) =>
              s.colId === action.colId ? { ...s, direction: action.direction! } : s,
            )
          : [...sort, { colId: action.colId, direction: action.direction }]
      return { criteria: { ...state.criteria, sort: next } }
    }
    case 'setSort':
      return { criteria: { ...state.criteria, sort: action.sort } }
    case 'undo':
      return state.undo ? { criteria: state.undo.criteria } : state
  }
}

/** All search state of one page. No data fetching, no AG Grid. */
export const useSearchState = <TFields extends FieldMap>(
  initial: SearchCriteria<TFields> = emptyCriteria(),
) => {
  const [state, dispatch] = useReducer(
    searchReducer<TFields>,
    { criteria: initial },
  )

  return {
    criteria: state.criteria,
    undo: state.undo,
    dispatch: dispatch as (action: SearchAction<TFields>) => void,
    setSearch: useCallback((text: string) => dispatch({ type: 'search', text }), []),
  }
}
