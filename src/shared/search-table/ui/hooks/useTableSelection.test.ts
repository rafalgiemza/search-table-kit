import '../../../../test/setup-dom.ts'
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { emptyCriteria } from '../../core/criteria.ts'
import { selectAllMatching, setRowSelected } from '../../core/selection.ts'
import { fakeApi, makeConfig, rows, type F, type Row } from './test-helpers.ts'
import { useTableSelection } from './useTableSelection.ts'

afterEach(cleanup)

const seen = new Map(rows.map((r) => [r.id, r]))
const byIndex = new Map(rows.map((r, i) => [i, r]))

const setup = (config = makeConfig(), total = 4, totalMatching = 40) => {
  const { api, calls } = fakeApi()
  const fetchRows = async () => ({ rows: [] as Row[], total: totalMatching })
  const hook = renderHook(() =>
    useTableSelection<Row, F>({
      config,
      api,
      criteria: emptyCriteria<F>(),
      fetchRows,
      total,
      seen,
      byIndex,
      modelTick: 0,
    }),
  )
  return { ...hook, calls }
}

const picked = (r: { current: ReturnType<typeof useTableSelection<Row, F>> }) =>
  r.current.selection.kind === 'ids' ? [...r.current.selection.ids].sort() : 'all'

test('select-page ticks only the rows the page rule allows', () => {
  const { result } = setup()
  assert.equal(result.current.pageCount, 3) // c is "sent" -> not selectable
  assert.equal(result.current.pageState(), 'none')

  act(() => result.current.togglePage(true))
  assert.deepEqual(picked(result), ['a', 'b', 'd'])
  assert.equal(result.current.pageAll, true)
  assert.equal(result.current.count, 3)

  act(() => result.current.togglePage(false))
  assert.deepEqual(picked(result), [])
  assert.equal(result.current.count, 0)
})

test('a single row toggles, and partial page state is "some"', () => {
  const { result } = setup()
  act(() => result.current.toggle('a', true))
  assert.equal(result.current.pageState(), 'some')
  assert.deepEqual(result.current.selectedRows.map((r) => r.id), ['a'])
  act(() => result.current.toggle('a', false))
  assert.equal(result.current.pageState(), 'none')
})

test('single mode keeps one row and ignores select-page', () => {
  const { result } = setup(makeConfig({ selection: { mode: 'single' } }))
  act(() => result.current.toggle('a', true))
  act(() => result.current.toggle('b', true))
  assert.deepEqual(picked(result), ['b'])
  act(() => result.current.togglePage(true))
  assert.deepEqual(picked(result), ['b'])
})

test('no selection mode and no actions means nothing is selectable', () => {
  const { result } = setup(makeConfig({ selection: undefined }))
  assert.equal(result.current.selectMode, 'none')
  assert.equal(result.current.isSelectable(rows[0]!), false)
  assert.equal(result.current.pageCount, 0)
})

test('actions without an explicit policy default to multiple selection', () => {
  const action = { id: 'x', label: 'X', confirm: { type: 'none' as const } }
  const { result } = setup(makeConfig({ selection: undefined, actions: [action] }))
  assert.equal(result.current.selectMode, 'multiple')
  assert.equal(result.current.isSelectable(rows[2]!), true)
})

test('redraws rows and header when the selection changes', () => {
  const { result, calls } = setup()
  const before = calls.redrawRows
  act(() => result.current.toggle('a', true))
  assert.ok(calls.redrawRows > before)
  assert.ok(calls.refreshHeader > 0)
})

test('"all matching" has no count until the server answers, then subtracts exclusions', async () => {
  const config = makeConfig()
  const { result } = setup(config, 4, 40)
  act(() => result.current.setSelection(selectAllMatching(emptyCriteria<F>(), config.selection)))
  assert.equal(result.current.count, null)
  await waitFor(() => assert.equal(result.current.count, 40))

  act(() => result.current.setSelection((s) => setRowSelected(s, 'a', false)))
  assert.equal(result.current.count, 39)
})

test('clearSelection empties an "all matching" selection too', () => {
  const { result } = setup()
  act(() => result.current.setSelection(selectAllMatching(emptyCriteria<F>())))
  act(() => result.current.clearSelection())
  assert.deepEqual(picked(result), [])
})
