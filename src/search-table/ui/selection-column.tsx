import type { CustomCellRendererProps, CustomHeaderProps, CustomNoRowsOverlayProps } from 'ag-grid-react'
import { useEffect, useRef } from 'react'

/**
 * What the grid's own renderers need from the table. Passed as AG Grid
 * `context`; selection lives in the table's state, not in the grid, so it can
 * express "all matching" across pages.
 */
export type GridContext = {
  isSelected: (id: string) => boolean
  isSelectable: (row: unknown) => boolean
  getRowId: (row: unknown) => string
  toggle: (id: string, on: boolean) => void
  togglePage: (on: boolean) => void
  pageState: () => 'none' | 'some' | 'all'
  activeFilters: ReadonlySet<string>
  hasFilters: boolean
  clearAll: () => void
}

export const SELECT_COL_ID = '__select'

export const SelectCell = ({ data, context }: CustomCellRendererProps) => {
  const ctx = context as GridContext
  if (!data) return null
  const id = ctx.getRowId(data)
  return (
    <input
      type="checkbox"
      aria-label={`Select ${id}`}
      checked={ctx.isSelected(id)}
      disabled={!ctx.isSelectable(data)}
      onChange={(e) => ctx.toggle(id, e.target.checked)}
    />
  )
}

export const SelectHeader = ({ context }: CustomHeaderProps) => {
  const ctx = context as GridContext
  const state = ctx.pageState()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some'
  }, [state])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all on this page"
      checked={state === 'all'}
      onChange={(e) => ctx.togglePage(e.target.checked)}
    />
  )
}

export const NoRows = ({ context }: CustomNoRowsOverlayProps) => {
  const ctx = context as GridContext
  return (
    <div className="empty">
      <p>No results match.</p>
      {ctx.hasFilters && (
        <button type="button" className="btn" onClick={ctx.clearAll}>
          Clear all filters
        </button>
      )}
    </div>
  )
}
