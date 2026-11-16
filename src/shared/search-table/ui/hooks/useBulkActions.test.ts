import '../../../../test/setup-dom.ts'
import assert from 'node:assert/strict'
import { useState } from 'react'
import { afterEach, mock, test } from 'node:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { emptySelection, type SelectionState } from '../../core/selection.ts'
import type { ActionResult, AnyBulkAction, Selection } from '../../types.ts'
import type { F, Row } from './test-helpers.ts'
import { useBulkActions } from './useBulkActions.ts'

afterEach(cleanup)

const action = (confirm: AnyBulkAction<Row, F>['confirm'] = { type: 'none' }): AnyBulkAction<Row, F> => ({
  id: 'send',
  label: 'Send',
  confirm,
})

const ids = (...list: string[]): SelectionState<F> => ({ kind: 'ids', ids: new Set(list) })

const setup = ({
  count = 2 as number | null,
  runAction = async (): Promise<ActionResult> => ({ message: 'done' }),
} = {}) => {
  const say = mock.fn((_text: string) => undefined)
  const refresh = mock.fn()
  const run = mock.fn(runAction as (id: string, s: Selection<F>, p: unknown) => Promise<ActionResult>)
  const hook = renderHook(() => {
    const [selection, setSelection] = useState<SelectionState<F>>(ids('a', 'b'))
    const bulk = useBulkActions<Row, F>({
      runAction: run,
      selection,
      setSelection,
      count,
      say,
      refresh,
    })
    return { ...bulk, selection }
  })
  return { ...hook, say, refresh, run }
}

test('runs the action on the selection, then clears it and refetches', async () => {
  const { result, say, refresh, run } = setup({
    runAction: async () => ({ message: '2 sent' }),
  })
  await act(() => result.current.run(action(), { mode: 'draft' }))

  assert.deepEqual(run.mock.calls[0]!.arguments, [
    'send',
    { mode: 'ids', ids: ['a', 'b'] },
    { mode: 'draft' },
  ])
  assert.equal(say.mock.calls[0]!.arguments[0], '2 sent')
  assert.equal(refresh.mock.callCount(), 1)
  assert.deepEqual(result.current.selection, emptySelection())
  assert.equal(result.current.busy, false)
})

test('a second run while one is in flight is ignored', async () => {
  let release!: (r: ActionResult) => void
  const { result, run } = setup({
    runAction: () => new Promise<ActionResult>((res) => (release = res)),
  })
  act(() => {
    void result.current.run(action())
    void result.current.run(action())
  })
  assert.equal(run.mock.callCount(), 1)
  assert.equal(result.current.busy, true)
  await act(async () => release({ message: 'ok' }))
  assert.equal(result.current.busy, false)
})

test('a failing action reports it and keeps the selection', async () => {
  const { result, say, refresh } = setup({
    runAction: async () => {
      throw new Error('boom')
    },
  })
  await act(() => result.current.run(action()))
  assert.equal(say.mock.calls[0]!.arguments[0], 'Send failed')
  assert.equal(refresh.mock.callCount(), 0)
  assert.deepEqual(result.current.selection, ids('a', 'b'))
  assert.equal(result.current.busy, false)
})

test('waits while the selection size is unknown, unless the menu overrides it', async () => {
  const { result, run } = setup({ count: null })
  await act(() => result.current.run(action()))
  assert.equal(run.mock.callCount(), 0)

  await act(() => result.current.run(action(), undefined, { mode: 'ids', ids: ['z'] }))
  assert.deepEqual(run.mock.calls[0]!.arguments[1], { mode: 'ids', ids: ['z'] })
})

test('menu start: "none" runs at once on the clicked row alone', async () => {
  const { result, run } = setup()
  await act(async () => result.current.startFromMenu(action({ type: 'none' }), 'z'))
  assert.deepEqual(run.mock.calls[0]!.arguments[1], { mode: 'ids', ids: ['z'] })
})

test('menu start: inline and dialog open their confirmation instead of running', () => {
  const { result, run } = setup()
  const inline = action({ type: 'inline', message: 'Sure?', confirmLabel: 'Yes' })
  act(() => result.current.startFromMenu(inline, 'z'))
  assert.equal(result.current.confirming, inline)
  assert.deepEqual(result.current.selection, ids('z')) // replaced by the clicked row

  const dialog = action({ type: 'dialog', Dialog: () => null })
  act(() => result.current.startFromMenu(dialog, null))
  assert.equal(result.current.dialogAction, dialog)
  assert.equal(run.mock.callCount(), 0)
})

test('running closes any open confirmation', async () => {
  const { result } = setup()
  const inline = action({ type: 'inline', message: 'Sure?', confirmLabel: 'Yes' })
  act(() => result.current.setConfirming(inline))
  await act(() => result.current.run(inline))
  assert.equal(result.current.confirming, null)
  assert.equal(result.current.dialogAction, null)
})
