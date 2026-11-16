import '../../../../test/setup-dom.ts'
import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import type { IServerSideGetRowsParams } from 'ag-grid-community'
import { act, cleanup, renderHook } from '@testing-library/react'
import { emptyCriteria } from '../../core/criteria.ts'
import type { SearchCriteria, SearchQuery } from '../../types.ts'
import { fakeApi, makeConfig, rows, type F, type Row } from './test-helpers.ts'
import { useServerData } from './useServerData.ts'

afterEach(cleanup)

const config = makeConfig()

const setup = (over: {
  criteria?: SearchCriteria<F>
  fetchRows?: (q: SearchQuery<F>) => Promise<{ rows: Row[]; total: number }>
  withApi?: boolean
} = {}) => {
  const fake = fakeApi()
  const dispatch = mock.fn()
  const fetchRows = mock.fn(over.fetchRows ?? (async () => ({ rows, total: 4 })))
  const hook = renderHook(
    ({ criteria }) =>
      useServerData<Row, F>({
        config,
        fetchRows: (q) => fetchRows(q),
        criteria,
        dispatch,
        api: over.withApi === false ? undefined : fake.api,
        pageSize: 50,
      }),
    { initialProps: { criteria: over.criteria ?? emptyCriteria<F>() } },
  )
  return { ...hook, ...fake, dispatch, fetchRows }
}

const getRows = (
  hook: { result: { current: ReturnType<typeof useServerData<Row, F>> } },
  api: unknown,
  sortModel: { colId: string; sort: 'asc' | 'desc' }[] = [],
) => {
  const success = mock.fn()
  const fail = mock.fn()
  const done = hook.result.current.datasource.getRows({
    request: { startRow: 0, endRow: 50, sortModel },
    api,
    success,
    fail,
  } as unknown as IServerSideGetRowsParams<Row>)
  return { success, fail, done }
}

test('the datasource sends the criteria and sort, and indexes what comes back', async () => {
  const s = setup({ criteria: { ...emptyCriteria<F>(), search: 'weld' } })
  s.state.columnState = [{ colId: 'id', sort: 'asc', sortIndex: 0 }]
  const { success, done } = getRows(s, s.api, [{ colId: 'id', sort: 'asc' }])
  await act(() => done)

  const query = s.fetchRows.mock.calls[0]!.arguments[0]
  assert.equal(query.search, 'weld')
  assert.deepEqual(query.sort, [{ colId: 'id', direction: 'asc' }])
  assert.equal(query.startRow, 0)
  assert.equal(query.endRow, 50)

  assert.deepEqual(success.mock.calls[0]!.arguments[0], { rowData: rows, rowCount: 4 })
  assert.equal(s.result.current.total, 4)
  assert.equal(s.result.current.byIndex.get(2)?.id, 'c')
  assert.equal(s.result.current.seen.get('d')?.id, 'd')
})

test('a response that arrives after the sort changed must not leak into the page index', async () => {
  const s = setup()
  // The user sorts while the request is in flight: the grid already reports a new sort.
  s.fetchRows.mock.mockImplementation(async () => {
    s.state.columnState = [{ colId: 'id', sort: 'desc', sortIndex: 0 }]
    return { rows, total: 4 }
  })
  const { success, done } = getRows(s, s.api, [])
  await act(() => done)

  assert.equal(success.mock.callCount(), 1) // the grid still gets its rows
  assert.equal(s.result.current.byIndex.size, 0)
  assert.equal(s.result.current.total, 0)
  assert.equal(s.result.current.seen.size, 4) // but they are remembered for selected ids
})

test('a failed request tells the grid instead of throwing', async () => {
  const s = setup({
    fetchRows: async () => {
      throw new Error('down')
    },
  })
  const { fail, success, done } = getRows(s, s.api)
  await act(() => done)
  assert.equal(fail.mock.callCount(), 1)
  assert.equal(success.mock.callCount(), 0)
})

test('refresh drops the cached index and purges the grid', async () => {
  const s = setup()
  await act(() => getRows(s, s.api).done)
  assert.equal(s.result.current.byIndex.size, 4)
  act(() => s.result.current.refresh())
  assert.equal(s.result.current.byIndex.size, 0)
  assert.deepEqual(s.calls.refreshServerSide, [{ purge: true }])
})

test('a header click is adopted into criteria; an unchanged sort is not re-dispatched', () => {
  const s = setup()
  s.state.columnState = [{ colId: 'id', sort: 'asc', sortIndex: 0 }]
  act(() => s.result.current.onSortChanged())
  assert.deepEqual(s.dispatch.mock.calls[0]!.arguments[0], {
    type: 'setSort',
    sort: [{ colId: 'id', direction: 'asc' }],
  })

  const same = setup({ criteria: { ...emptyCriteria<F>(), sort: [{ colId: 'id', direction: 'asc' }] } })
  same.state.columnState = [{ colId: 'id', sort: 'asc', sortIndex: 0 }]
  act(() => same.result.current.onSortChanged())
  assert.equal(same.dispatch.mock.callCount(), 0)
})

test('criteria sort (undo, a saved view) is pushed to the grid', () => {
  const s = setup({ criteria: { ...emptyCriteria<F>(), sort: [{ colId: 'id', direction: 'desc' }] } })
  assert.deepEqual(s.calls.applyColumnState[0], {
    state: [{ colId: 'id', sort: 'desc', sortIndex: 0 }],
    defaultState: { sort: null },
  })
})

test('criteria and grid already agreeing is left alone', () => {
  const s = setup()
  assert.equal(s.calls.applyColumnState.length, 0)
})

test('changing search or filters goes back to page one once, and tells the caller', () => {
  const s = setup()
  const onChange = mock.fn()

  act(() => s.result.current.reloadFromStart(onChange))
  assert.equal(onChange.mock.callCount(), 0) // nothing changed yet

  s.rerender({ criteria: { ...emptyCriteria<F>(), search: 'x' } })
  act(() => s.result.current.reloadFromStart(onChange))
  assert.equal(onChange.mock.callCount(), 1)
  assert.equal(s.calls.goToFirstPage, 1)
  assert.deepEqual(s.calls.refreshServerSide, [{ purge: true }])

  act(() => s.result.current.reloadFromStart(onChange)) // same key: no second reload
  assert.equal(onChange.mock.callCount(), 1)
})

test('a sort-only change does not reload from the first page', () => {
  const s = setup()
  const onChange = mock.fn()
  s.rerender({ criteria: { ...emptyCriteria<F>(), sort: [{ colId: 'id', direction: 'asc' }] } })
  act(() => s.result.current.reloadFromStart(onChange))
  assert.equal(onChange.mock.callCount(), 0)
  assert.equal(s.calls.goToFirstPage, 0)
})

test('before the grid is ready nothing is reloaded or remembered as handled', () => {
  const s = setup({ withApi: false })
  const onChange = mock.fn()
  s.rerender({ criteria: { ...emptyCriteria<F>(), search: 'x' } })
  act(() => s.result.current.reloadFromStart(onChange))
  assert.equal(onChange.mock.callCount(), 0)
})
