import type { GridApi } from 'ag-grid-community'
import type { ViewLayout } from '../types.ts'
import { SELECT_COL_ID } from './selection-column.tsx'

/** Column order and widths as they are now, without the selection column. */
export const captureLayout = (api: GridApi): ViewLayout => {
  const columns = api.getColumnState().filter((c) => c.colId !== SELECT_COL_ID)
  return {
    columnOrder: columns.map((c) => c.colId),
    columnWidths: Object.fromEntries(columns.map((c) => [c.colId, c.width ?? 0])),
  }
}

export const applyLayout = (api: GridApi, layout: ViewLayout) => {
  const widths = layout.columnWidths ?? {}
  api.applyColumnState({
    // The selection column always stays first.
    state: [SELECT_COL_ID, ...(layout.columnOrder ?? [])].map((colId) => ({
      colId,
      width: widths[colId] || undefined,
    })),
    applyOrder: true,
  })
}
