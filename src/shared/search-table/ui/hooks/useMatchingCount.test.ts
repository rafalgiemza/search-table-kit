import '../../../../test/setup-dom.ts'
import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { emptyCriteria } from '../../core/criteria.ts'
import type { SearchQuery } from '../../types.ts'
import type { F, Row } from './test-helpers.ts'
import { useMatchingCount } from './useMatchingCount.ts'

afterEach(cleanup)

test('asks for a zero-row window and returns the total', async () => {
  const fetchRows = mock.fn(async (_q: SearchQuery<F>) => ({ rows: [] as Row[], total: 42 }))
  const { result } = renderHook(() =>
    useMatchingCount<Row, F>(emptyCriteria<F>(), fetchRows, true),
  )
  await waitFor(() => assert.equal(result.current.total, 42))
  assert.equal(result.current.failed, false)
  const query = fetchRows.mock.calls[0]!.arguments[0]
  assert.equal(query.startRow, 0)
  assert.equal(query.endRow, 0)
})

test('does nothing while disabled', async () => {
  const fetchRows = mock.fn(async () => ({ rows: [] as Row[], total: 1 }))
  const { result } = renderHook(() =>
    useMatchingCount<Row, F>(emptyCriteria<F>(), fetchRows, false),
  )
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(fetchRows.mock.callCount(), 0)
  assert.equal(result.current.total, undefined)
  assert.equal(result.current.failed, false)
})

test('reports a failed count instead of guessing', async () => {
  const fetchRows = mock.fn(async () => {
    throw new Error('down')
  })
  const { result } = renderHook(() =>
    useMatchingCount<Row, F>(emptyCriteria<F>(), fetchRows, true),
  )
  await waitFor(() => assert.equal(result.current.failed, true))
  assert.equal(result.current.total, undefined)
})

test('a changed criteria forgets the old total until the new one arrives', async () => {
  const fetchRows = mock.fn(async (q: SearchQuery<F>) => ({
    rows: [] as Row[],
    total: q.search === 'x' ? 5 : 10,
  }))
  const { result, rerender } = renderHook(
    ({ search }) => useMatchingCount<Row, F>({ ...emptyCriteria<F>(), search }, fetchRows, true),
    { initialProps: { search: '' } },
  )
  await waitFor(() => assert.equal(result.current.total, 10))
  rerender({ search: 'x' })
  assert.equal(result.current.total, undefined)
  await waitFor(() => assert.equal(result.current.total, 5))
})
