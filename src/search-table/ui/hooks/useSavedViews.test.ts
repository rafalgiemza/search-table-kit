import '../../../test/setup-dom.ts'
import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { emptyCriteria } from '../../core/criteria.ts'
import { ALL_VIEW_ID } from '../../core/views.ts'
import type { SavedView, SearchCriteria, ViewStorage } from '../../types.ts'
import { fakeApi, makeConfig, type F, type Row } from './test-helpers.ts'
import { useSavedViews } from './useSavedViews.ts'

afterEach(cleanup)

const shipped: SavedView<F> = {
  id: 'drafts',
  name: 'Drafts',
  isDefault: false,
  schemaVersion: 1,
  criteria: { search: '', filters: { status: { condition: 'in', values: ['draft'] } } },
}
const stale: SavedView<F> = {
  id: 'old',
  name: 'Old',
  isDefault: false,
  schemaVersion: 1,
  criteria: {
    search: '',
    filters: { ghost: { condition: 'in', values: ['x'] } } as unknown as SearchCriteria<F>['filters'],
  },
}

const memoryStorage = () => {
  const saved = new Map<string, SavedView<F>>()
  let defaultId: string | null = null
  const storage: ViewStorage<F> = {
    list: async () => [...saved.values()],
    save: async (_p, v) => void saved.set(v.id, v),
    remove: async (_p, id) => void saved.delete(id),
    getDefaultId: async () => defaultId,
    setDefaultId: async (_p, id) => void (defaultId = id),
  }
  return { storage, saved, getDefault: () => defaultId }
}

const setup = (over: { userViews?: SavedView<F>[]; total?: number; withApi?: boolean } = {}) => {
  const mem = memoryStorage()
  const fake = fakeApi()
  const dispatch = mock.fn()
  const say = mock.fn()
  const clearSelection = mock.fn()
  const fetchRows = mock.fn(async () => ({ rows: [] as Row[], total: over.total ?? 7 }))
  const config = makeConfig({ defaultViews: [shipped] })
  const hook = renderHook(
    ({ criteria }) =>
      useSavedViews<Row, F>({
        config,
        storage: mem.storage,
        initial: {
          userViews: over.userViews ?? [],
          defaultId: null,
          activeId: ALL_VIEW_ID,
          criteria: emptyCriteria<F>(),
        },
        criteria,
        dispatch,
        api: over.withApi === false ? undefined : fake.api,
        fetchRows,
        clearSelection,
        say,
      }),
    { initialProps: { criteria: emptyCriteria<F>() as SearchCriteria<F> } },
  )
  return { ...hook, ...mem, ...fake, dispatch, say, clearSelection, fetchRows }
}

test('starts with "All items", the shipped views and the user\'s own, in that order', () => {
  const { result } = setup({ userViews: [stale] })
  assert.deepEqual(result.current.views.map((v) => v.id), [ALL_VIEW_ID, 'drafts', 'old'])
  assert.equal(result.current.activeView.id, ALL_VIEW_ID)
  assert.equal(result.current.defaultId, ALL_VIEW_ID)
  assert.deepEqual([...result.current.ownIds], ['old'])
  assert.equal(result.current.dirty, false)
})

test('opening a view loads its criteria, clears the selection and marks it active', () => {
  const { result, dispatch, clearSelection } = setup()
  act(() => result.current.loadView(shipped))
  assert.deepEqual(dispatch.mock.calls[0]!.arguments[0], {
    type: 'load',
    label: 'Drafts',
    criteria: { search: '', filters: shipped.criteria.filters, sort: [] },
  })
  assert.equal(clearSelection.mock.callCount(), 1)
  assert.equal(result.current.activeView.id, 'drafts')
})

test('a view with filters the page no longer has loads without them and says so', () => {
  const { result, dispatch, say } = setup({ userViews: [stale] })
  act(() => result.current.loadView(stale))
  const loaded = dispatch.mock.calls[0]!.arguments[0] as { criteria: SearchCriteria<F> }
  assert.deepEqual(loaded.criteria.filters, {})
  assert.equal(say.mock.calls[0]!.arguments[0], 'Dropped filters that no longer exist: ghost')
})

test('a reset offers undo', () => {
  const { result, dispatch, say } = setup()
  act(() => result.current.loadView(result.current.activeView, 'Reset to “All items”'))
  const [text, action] = say.mock.calls[0]!.arguments as [string, { label: string; run: () => void }]
  assert.equal(text, 'Reset to “All items”')
  action.run()
  assert.deepEqual(dispatch.mock.calls[1]!.arguments[0], { type: 'undo' })
})

test('dirty follows the criteria against the active view', () => {
  const { result, rerender } = setup()
  rerender({ criteria: { ...emptyCriteria<F>(), search: 'weld' } })
  assert.equal(result.current.dirty, true)
  rerender({ criteria: emptyCriteria<F>() })
  assert.equal(result.current.dirty, false)
})

test('saving stores the current search and filters under a new id and activates it', async () => {
  const s = setup()
  s.rerender({ criteria: { ...emptyCriteria<F>(), search: 'weld', sort: [{ colId: 'id', direction: 'asc' }] } })
  await act(() => s.result.current.saveNew('Mine', false))

  const [view] = [...s.saved.values()]
  assert.equal(view!.name, 'Mine')
  assert.equal(view!.criteria.search, 'weld')
  assert.equal(view!.sort, undefined) // sort and layout only when asked
  assert.equal(s.result.current.activeView.id, view!.id)
  assert.ok(s.result.current.ownIds.has(view!.id))
  assert.equal(s.say.mock.calls[0]!.arguments[0], 'Saved view “Mine”')
})

test('saving with layout also keeps the sort and the grid\'s column layout', async () => {
  const s = setup()
  s.state.columnState = [{ colId: 'id', width: 90 } as never]
  s.rerender({ criteria: { ...emptyCriteria<F>(), sort: [{ colId: 'id', direction: 'desc' }] } })
  await act(() => s.result.current.saveNew('Wide', true))
  const [view] = [...s.saved.values()]
  assert.deepEqual(view!.sort, [{ colId: 'id', direction: 'desc' }])
  assert.deepEqual(view!.layout, { columnOrder: ['id'], columnWidths: { id: 90 } })
})

test('updating rewrites the active view in place', async () => {
  const s = setup()
  await act(() => s.result.current.saveNew('Mine', false))
  const id = s.result.current.activeView.id
  s.rerender({ criteria: { ...emptyCriteria<F>(), search: 'changed' } })
  assert.equal(s.result.current.dirty, true)

  await act(() => s.result.current.update(false))
  assert.equal(s.saved.get(id)!.criteria.search, 'changed')
  assert.equal(s.result.current.views.filter((v) => v.id === id).length, 1)
  assert.equal(s.result.current.dirty, false)
})

test('deleting the active view falls back to the default one', async () => {
  const s = setup()
  await act(() => s.result.current.saveNew('Mine', false))
  const id = s.result.current.activeView.id
  s.dispatch.mock.resetCalls()

  await act(() => s.result.current.remove(id))
  assert.equal(s.saved.has(id), false)
  assert.equal(s.result.current.activeView.id, ALL_VIEW_ID)
  assert.equal((s.dispatch.mock.calls[0]!.arguments[0] as { type: string }).type, 'load')
})

test('deleting the view that was the default clears that choice', async () => {
  const s = setup()
  await act(() => s.result.current.saveNew('Mine', false))
  const id = s.result.current.activeView.id
  await act(() => s.result.current.makeDefault(id))
  assert.equal(s.getDefault(), id)
  assert.equal(s.result.current.defaultId, id)

  await act(() => s.result.current.remove(id))
  assert.equal(s.result.current.defaultId, ALL_VIEW_ID)
})

test('counts are fetched per view when the list opens', async () => {
  const s = setup({ total: 7 })
  act(() => s.result.current.loadCounts())
  await waitFor(() => assert.equal(s.result.current.counts[ALL_VIEW_ID], 7))
  assert.equal(s.result.current.counts.drafts, 7)
  const drafts = s.fetchRows.mock.calls
    .map((c) => (c.arguments as unknown as [SearchCriteria<F>])[0])
    .find((q) => 'status' in q.filters)
  assert.ok(drafts, 'the drafts view is counted with its own filter')
})

test('a failing count is ignored rather than breaking the dropdown', async () => {
  const s = setup()
  s.fetchRows.mock.mockImplementation(async () => {
    throw new Error('down')
  })
  act(() => s.result.current.loadCounts())
  await new Promise((r) => setTimeout(r, 10))
  assert.deepEqual(s.result.current.counts, {})
})
