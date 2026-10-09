import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FieldMap, SavedView } from '../types.ts'
import { clearFilters, emptyCriteria, setFilter, toQuery, withPredicate } from './criteria.ts'
import { resolveQuickRange } from './dates.ts'
import { searchReducer } from './search-state.ts'
import {
  emptySelection,
  isSelected,
  selectAllMatching,
  selectedCount,
  setPageSelected,
  setRowSelected,
  toSelection,
} from './selection.ts'
import {
  ALL_VIEW_ID,
  availableViews,
  criteriaFromView,
  isViewDirty,
  localStorageViewStorage,
  resolveDefaultView,
} from './views.ts'

type F = { status: 'multiSelect'; endDate: 'date'; description: 'text' } & FieldMap
const today = new Date(2026, 9, 9) // 2026-10-09

test('quick ranges resolve against today', () => {
  assert.deepEqual(resolveQuickRange('last30days', today), {
    condition: 'between',
    from: '2026-09-09',
    to: '2026-10-09',
  })
  assert.deepEqual(resolveQuickRange('thisMonth', today), {
    condition: 'between',
    from: '2026-10-01',
    to: '2026-10-31',
  })
  assert.deepEqual(resolveQuickRange('beforeToday', today), {
    condition: 'before',
    date: '2026-10-09',
  })
})

test('toQuery resolves relative dates and keeps the window', () => {
  const c = setFilter(emptyCriteria<F>(), 'endDate', {
    condition: 'quick',
    range: 'today',
    relative: true,
  })
  const q = toQuery(c, { startRow: 0, endRow: 50 }, today)
  assert.deepEqual(q.filters.endDate, {
    condition: 'between',
    from: '2026-10-09',
    to: '2026-10-09',
  })
  assert.equal(q.endRow, 50)
  // the stored criteria stay symbolic
  assert.equal((c.filters.endDate as { condition: string }).condition, 'quick')
})

test('clearFilters keeps search and sort', () => {
  const c = {
    search: 'x',
    sort: [{ colId: 'id', direction: 'asc' as const }],
    filters: { status: { condition: 'in' as const, values: ['sent'] } },
  }
  assert.deepEqual(clearFilters<F>(c), { search: 'x', sort: c.sort, filters: {} })
})

test('predicate intersects "in" lists and overrides otherwise', () => {
  const c = setFilter(emptyCriteria<F>(), 'status', {
    condition: 'in',
    values: ['draft', 'sent'],
  })
  const out = withPredicate(c, { status: { condition: 'in', values: ['sent'] } })
  assert.deepEqual(out.filters.status, { condition: 'in', values: ['sent'] })
  const none = withPredicate(emptyCriteria<F>(), {
    status: { condition: 'in', values: ['sent'] },
  })
  assert.deepEqual(none.filters.status, { condition: 'in', values: ['sent'] })
})

test('reducer: clear all can be undone', () => {
  let s = { criteria: emptyCriteria<F>() }
  s = searchReducer(s, {
    type: 'setFilter',
    id: 'status',
    value: { condition: 'in', values: ['sent'] },
  })
  const cleared = searchReducer(s, { type: 'clearFilters' })
  assert.deepEqual(cleared.criteria.filters, {})
  const restored = searchReducer(cleared, { type: 'undo' })
  assert.deepEqual(restored.criteria, s.criteria)
})

test('reducer: multi-sort keeps order and updates in place', () => {
  let s = { criteria: emptyCriteria<F>() }
  s = searchReducer(s, { type: 'sort', colId: 'status', direction: 'asc' })
  s = searchReducer(s, { type: 'sort', colId: 'id', direction: 'desc' })
  assert.deepEqual(s.criteria.sort, [
    { colId: 'status', direction: 'asc' },
    { colId: 'id', direction: 'desc' },
  ])
  s = searchReducer(s, { type: 'sort', colId: 'status', direction: 'desc' })
  assert.deepEqual(s.criteria.sort[0], { colId: 'status', direction: 'desc' })
  s = searchReducer(s, { type: 'sort', colId: 'status', direction: null })
  assert.deepEqual(s.criteria.sort, [{ colId: 'id', direction: 'desc' }])
})

test('reducer: setSort replaces the whole model', () => {
  let s = { criteria: emptyCriteria<F>() }
  s = searchReducer(s, { type: 'sort', colId: 'id', direction: 'asc' })
  s = searchReducer(s, { type: 'setSort', sort: [{ colId: 'status', direction: 'asc' }] })
  assert.deepEqual(s.criteria.sort, [{ colId: 'status', direction: 'asc' }])
})

test('selection: page, then all matching, with exclusions', () => {
  let sel = setPageSelected(emptySelection<F>(), ['1', '2'], true)
  assert.equal(selectedCount(sel, 200), 2)
  sel = selectAllMatching(emptyCriteria<F>())
  assert.equal(selectedCount(sel, 200), 200)
  sel = setRowSelected(sel, '7', false)
  assert.equal(isSelected(sel, '7'), false)
  assert.equal(selectedCount(sel, 200), 199)
  assert.deepEqual(toSelection(sel), {
    mode: 'criteria',
    criteria: emptyCriteria<F>(),
    excludedIds: ['7'],
  })
})

test('selection: "all matching" carries the page predicate', () => {
  const sel = selectAllMatching(emptyCriteria<F>(), {
    mode: 'multiple',
    criteriaPredicate: { status: { condition: 'in', values: ['sent'] } },
  })
  assert.deepEqual(toSelection(sel), {
    mode: 'criteria',
    criteria: {
      search: '',
      sort: [],
      filters: { status: { condition: 'in', values: ['sent'] } },
    },
    excludedIds: [],
  })
})

const view: SavedView<F> = {
  id: 'v1',
  name: 'Open',
  isDefault: false,
  schemaVersion: 1,
  criteria: {
    search: '',
    filters: {
      status: { condition: 'in', values: ['draft'] },
      endDate: { condition: 'isEmpty' },
    },
  },
}

test('view: unknown fields are dropped and reported', () => {
  const { criteria, dropped } = criteriaFromView(view, ['status'])
  assert.deepEqual(dropped, ['endDate'])
  assert.deepEqual(Object.keys(criteria.filters), ['status'])
})

test('view: dirty detection ignores key order', () => {
  const same = { search: '', sort: [], filters: { endDate: view.criteria.filters.endDate, status: view.criteria.filters.status } }
  assert.equal(isViewDirty(view, same), false)
  assert.equal(isViewDirty(view, { ...same, search: 'a' }), true)
})

test('view storage: save replaces in place, default id survives other edits', async () => {
  const mem = new Map<string, string>()
  const storage = localStorageViewStorage<F>({
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
  })
  await storage.save('p', { ...view, id: 'a' })
  await storage.save('p', { ...view, id: 'b' })
  await storage.save('p', { ...view, id: 'a', name: 'Renamed' })
  assert.deepEqual((await storage.list('p')).map((v) => [v.id, v.name]), [['a', 'Renamed'], ['b', 'Open']])
  await storage.setDefaultId('p', 'b')
  assert.equal(await storage.getDefaultId('p'), 'b')
  await storage.remove('p', 'b')
  assert.equal(await storage.getDefaultId('p'), null)
  assert.equal((await storage.list('p')).length, 1)
})

test('default view: user choice, then shipped default, then "All items"', () => {
  const shipped = [{ ...view, id: 'open', isDefault: true }]
  const views = availableViews<F>(shipped, [{ ...view, id: 'mine' }], 1)
  assert.deepEqual(views.map((v) => v.id), [ALL_VIEW_ID, 'open', 'mine'])
  assert.equal(resolveDefaultView(views, 'mine').id, 'mine')
  assert.equal(resolveDefaultView(views, null).id, 'open')
  assert.equal(resolveDefaultView(availableViews<F>([], [], 1), null).id, ALL_VIEW_ID)
  assert.equal(resolveDefaultView(views, 'gone').id, 'open')
})

test('view without saved sort keeps the current sort', () => {
  const sort = [{ colId: 'id', direction: 'asc' as const }]
  assert.deepEqual(criteriaFromView(view, ['status', 'endDate'], sort).criteria.sort, sort)
  assert.deepEqual(
    criteriaFromView({ ...view, sort: [] }, ['status'], sort).criteria.sort,
    [],
  )
})
