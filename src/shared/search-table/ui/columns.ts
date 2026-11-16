import type { ColDef } from 'ag-grid-community'
import type { FieldMap, SearchColumn } from '../types.ts'
import { SELECT_COL_ID } from './grid-constants.ts'
import { SelectCell, SelectHeader, type GridContext } from './selection-column.tsx'

/**
 * The page's columns, plus a pinned selection column when rows can be
 * selected. A column with a filter shows an icon in its header while that
 * filter is active.
 */
export const buildColumnDefs = <TRow, TFields extends FieldMap>(
  columns: readonly SearchColumn<TRow, TFields>[],
  selectMode: 'none' | 'single' | 'multiple',
): ColDef<TRow>[] => {
  const data = columns.map(({ filterField, ...col }) => ({
    ...col,
    headerClass: (p: { context: GridContext }) =>
      filterField && p.context.activeFilters.has(filterField) ? 'has-filter' : undefined,
  })) as ColDef<TRow>[]
  return selectMode === 'none'
    ? data
    : [
        {
          colId: SELECT_COL_ID,
          headerComponent: selectMode === 'multiple' ? SelectHeader : undefined,
          cellRenderer: SelectCell,
          width: 48,
          pinned: 'left',
          sortable: false,
          resizable: false,
          suppressMovable: true,
          lockPosition: 'left',
        },
        ...data,
      ]
}
