import type { GridApi } from 'ag-grid-community'
import type { FieldMap, SearchPageConfig } from '../../types.ts'

export type Row = { id: string; status: 'draft' | 'sent' }
export type F = { status: 'multiSelect' } & FieldMap

export const rows: Row[] = [
  { id: 'a', status: 'draft' },
  { id: 'b', status: 'draft' },
  { id: 'c', status: 'sent' },
  { id: 'd', status: 'draft' },
]

export const makeConfig = (over: Partial<SearchPageConfig<Row, F>> = {}): SearchPageConfig<Row, F> => ({
  id: 'page',
  title: 'Page',
  getRowId: (r) => r.id,
  fields: { status: { kind: 'multiSelect', label: 'Status', hint: '', options: [] } },
  columns: [],
  selection: {
    mode: 'multiple',
    selectableWhen: { status: { condition: 'in', values: ['draft'] } },
  },
  ...over,
})

type ColumnState = { colId: string; sort?: 'asc' | 'desc' | null; sortIndex?: number | null }

/** Just enough of AG Grid's API for the hooks, recording what they ask of it. */
export const fakeApi = (init: { pageSize?: number; page?: number } = {}) => {
  const state = { pageSize: init.pageSize ?? 50, page: init.page ?? 0, columnState: [] as ColumnState[] }
  const calls = {
    redrawRows: 0,
    refreshHeader: 0,
    goToFirstPage: 0,
    refreshServerSide: [] as unknown[],
    applyColumnState: [] as unknown[],
  }
  const api = {
    paginationGetPageSize: () => state.pageSize,
    paginationGetCurrentPage: () => state.page,
    getColumnState: () => state.columnState,
    redrawRows: () => void calls.redrawRows++,
    refreshHeader: () => void calls.refreshHeader++,
    paginationGoToFirstPage: () => void calls.goToFirstPage++,
    refreshServerSide: (p: unknown) => void calls.refreshServerSide.push(p),
    applyColumnState: (p: unknown) => void calls.applyColumnState.push(p),
  }
  return { api: api as unknown as GridApi<Row>, state, calls }
}
