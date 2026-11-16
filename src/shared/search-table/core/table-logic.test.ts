import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AnyBulkAction, FieldMap, SelectionPolicy } from '../types.ts'
import { emptyCriteria, filtersKey, queryKey } from './criteria.ts'
import { matchesFilters } from './match.ts'
import { planRowMenu } from './row-menu.ts'
import {
  emptySelection,
  isRowSelectable,
  pageSelectionState,
  selectAllMatching,
  selectionSize,
  setRowSelected,
  type SelectionState,
} from './selection.ts'
import { sortFromColumnState } from './sort.ts'
import { snapshotView } from './views.ts'

type F = { status: 'multiSelect'; description: 'text' } & FieldMap
type Row = { id: string; status: 'draft' | 'sent' }

const ids = (...list: string[]): SelectionState<F> => ({ kind: 'ids', ids: new Set(list) })

/* ------------------------------ sort / keys ------------------------------- */

test('sortFromColumnState keeps sorted columns in priority order', () => {
  assert.deepEqual(
    sortFromColumnState([
      { colId: 'a', sort: null },
      { colId: 'b', sort: 'desc', sortIndex: 1 },
      { colId: 'c', sort: 'asc', sortIndex: 0 },
      { colId: 'd' },
    ]),
    [
      { colId: 'c', direction: 'asc' },
      { colId: 'b', direction: 'desc' },
    ],
  )
})

test('a sort change alters the query key but not the filters key', () => {
  const c = emptyCriteria<F>()
  const sorted = { ...c, sort: [{ colId: 'a', direction: 'asc' as const }] }
  assert.equal(filtersKey(c), filtersKey(sorted))
  assert.notEqual(queryKey(c, []), queryKey(c, [{ colId: 'a', direction: 'asc' }]))
  assert.notEqual(filtersKey(c), filtersKey({ ...c, search: 'x' }))
})

/* ------------------------------- selection -------------------------------- */

test('matchesFilters applies the same rules the backend does', () => {
  const row = { status: 'draft', description: 'Weld seam' }
  assert.equal(matchesFilters(row, { status: { condition: 'in', values: ['draft', 'pending'] } }), true)
  assert.equal(matchesFilters(row, { status: { condition: 'notIn', values: ['draft'] } }), false)
  assert.equal(matchesFilters(row, { description: { condition: 'contains', value: 'WELD' } }), true)
  assert.equal(matchesFilters(row, {}), true)
})

test('isRowSelectable combines selectableWhen and the isSelectable escape hatch', () => {
  const policy: SelectionPolicy<Row, F> = {
    mode: 'multiple',
    selectableWhen: { status: { condition: 'in', values: ['draft'] } },
    isSelectable: (r) => r.id !== 'locked',
  }
  assert.equal(isRowSelectable({ id: '1', status: 'draft' }, policy), true)
  assert.equal(isRowSelectable({ id: '1', status: 'sent' }, policy), false)
  assert.equal(isRowSelectable({ id: 'locked', status: 'draft' }, policy), false)
  assert.equal(isRowSelectable({ id: '1', status: 'sent' }, undefined), true)
})

test('the grid rule and the "all matching" criteria come from one definition', () => {
  const policy: SelectionPolicy<Row, F> = {
    mode: 'multiple',
    selectableWhen: { status: { condition: 'in', values: ['draft'] } },
  }
  const sel = selectAllMatching(emptyCriteria<F>(), policy)
  assert.equal(sel.kind, 'all')
  assert.deepEqual(sel.kind === 'all' && sel.criteria.filters, policy.selectableWhen)
})

test('pageSelectionState: none / some / all, and an empty page is none', () => {
  assert.equal(pageSelectionState(ids(), ['1', '2']), 'none')
  assert.equal(pageSelectionState(ids('1'), ['1', '2']), 'some')
  assert.equal(pageSelectionState(ids('1', '2', '9'), ['1', '2']), 'all')
  assert.equal(pageSelectionState(ids('1'), []), 'none')
})

test('selectionSize is null until "all matching" has a known size', () => {
  assert.equal(selectionSize(ids('1', '2'), 200, undefined), 2)
  const all = setRowSelected(selectAllMatching(emptyCriteria<F>()), '7', false)
  assert.equal(selectionSize(all, 200, undefined), null)
  assert.equal(selectionSize(all, 200, 40), 39)
  assert.equal(selectionSize(emptySelection<F>(), 0, undefined), 0)
})

/* ------------------------------- row menu --------------------------------- */

const send: AnyBulkAction<Row, F> = {
  id: 'send',
  label: 'Send',
  isApplicable: (r) => r.status === 'draft',
  skippedReason: 'already sent',
  confirm: { type: 'none' },
}
const hidden: AnyBulkAction<Row, F> = { ...send, id: 'hidden', label: 'Hidden', contextMenu: false }

const draft: Row = { id: '1', status: 'draft' }
const sent: Row = { id: '2', status: 'sent' }

const plan = (over: Partial<Parameters<typeof planRowMenu<Row, F>>[0]> = {}) =>
  planRowMenu<Row, F>({
    clicked: draft,
    id: '1',
    selection: ids(),
    selectedRows: [],
    actions: [send, hidden],
    selectMode: 'multiple',
    clickedSelectable: true,
    busy: false,
    count: 0,
    ...over,
  })

test('right-click outside the selection acts on that row alone', () => {
  const p = plan({ selection: ids('2'), selectedRows: [sent] })
  assert.equal(p.inSelection, false)
  assert.deepEqual(p.rows, [draft])
  assert.deepEqual(p.selection, { mode: 'ids', ids: ['1'] })
  assert.deepEqual(p.actions.map((a) => a.label), ['Send'])
  assert.equal(p.actions[0]!.disabled, false)
})

test('right-click on a selected row acts on the whole selection and reports skips', () => {
  const p = plan({ selection: ids('1', '2'), selectedRows: [draft, sent], count: 2 })
  assert.equal(p.inSelection, true)
  assert.deepEqual(p.rows, [draft, sent])
  assert.equal(p.actions[0]!.label, 'Send (1 of 2)')
  assert.equal(p.actions[0]!.disabled, false)
})

test('an action nothing qualifies for is disabled with a reason', () => {
  const p = plan({ clicked: sent, id: '2' })
  assert.equal(p.actions[0]!.disabled, true)
  assert.equal(p.actions[0]!.tooltip, 'Not applicable: already sent')
})

test('no actions for an unselectable, unselected row or when selection is off', () => {
  assert.deepEqual(plan({ clickedSelectable: false }).actions, [])
  assert.deepEqual(plan({ selectMode: 'none' }).actions, [])
})

test('actions wait while busy or while the selection size is unknown', () => {
  assert.equal(plan({ busy: true }).actions[0]!.disabled, true)
  const all = plan({
    selection: { kind: 'all', criteria: emptyCriteria<F>(), excluded: new Set() },
    count: null,
  })
  assert.equal(all.actions[0]!.disabled, true)
})

/* --------------------------------- views ---------------------------------- */

test('snapshotView stores sort and layout only when asked to', () => {
  const criteria = { ...emptyCriteria<F>(), sort: [{ colId: 'a', direction: 'asc' as const }] }
  const meta = { id: 'v', name: 'V', schemaVersion: 2 }
  const layout = { columnOrder: ['a'] }

  const plain = snapshotView(criteria, meta, false, layout)
  assert.equal(plain.sort, undefined)
  assert.equal(plain.layout, undefined)
  assert.equal(plain.isDefault, false)
  assert.equal(plain.schemaVersion, 2)

  const full = snapshotView(criteria, meta, true, layout)
  assert.deepEqual(full.sort, criteria.sort)
  assert.deepEqual(full.layout, layout)
})
