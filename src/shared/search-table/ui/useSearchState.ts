import { useCallback, useReducer } from 'react'
import { emptyCriteria } from '../core/criteria.ts'
import { searchReducer, type SearchAction } from '../core/search-state.ts'
import type { FieldMap, SearchCriteria } from '../types.ts'

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
