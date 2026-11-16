import '../../../../test/setup-dom.ts'
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { cleanup, renderHook } from '@testing-library/react'
import type { GridContext } from '../selection-column.tsx'
import { useStableGridContext } from './useStableGridContext.ts'

afterEach(cleanup)

const make = (selected: string, filters: string[]): GridContext => ({
  isSelected: (id) => id === selected,
  isSelectable: () => true,
  getRowId: (row) => String(row),
  toggle: () => undefined,
  togglePage: () => undefined,
  pageState: () => 'none',
  activeFilters: new Set(filters),
  hasFilters: filters.length > 0,
  clearAll: () => undefined,
})

test('the context object is stable but always reads the latest render', () => {
  const { result, rerender } = renderHook(({ ctx }) => useStableGridContext(ctx), {
    initialProps: { ctx: make('1', []) },
  })
  const first = result.current
  assert.equal(first.isSelected('1'), true)
  assert.equal(first.hasFilters, false)

  rerender({ ctx: make('2', ['status']) })
  assert.equal(result.current, first)
  assert.equal(first.isSelected('1'), false)
  assert.equal(first.isSelected('2'), true)
  assert.equal(first.hasFilters, true)
  assert.ok(first.activeFilters.has('status'))
})
