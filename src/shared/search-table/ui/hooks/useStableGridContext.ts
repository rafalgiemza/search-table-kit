import { useEffect, useMemo, useRef } from 'react'
import type { GridContext } from '../selection-column.tsx'

/**
 * The grid keeps the context it was given; a stable object that delegates to
 * the latest render means its renderers never act on a stale closure.
 */
export function useStableGridContext(latest: GridContext): GridContext {
  const latestRef = useRef(latest)
  useEffect(() => {
    latestRef.current = latest
  })
  return useMemo<GridContext>(
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
}
