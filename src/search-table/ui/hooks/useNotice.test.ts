import '../../../test/setup-dom.ts'
import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useNotice } from './useNotice.ts'

afterEach(() => {
  cleanup()
  mock.timers.reset()
})

test('say shows a notice and it dismisses itself after 6 seconds', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { result } = renderHook(() => useNotice())
  assert.equal(result.current.notice, null)

  act(() => result.current.say('Saved'))
  assert.equal(result.current.notice?.text, 'Saved')

  act(() => mock.timers.tick(5999))
  assert.equal(result.current.notice?.text, 'Saved')
  act(() => mock.timers.tick(1))
  assert.equal(result.current.notice, null)
})

test('a newer notice replaces the older one and restarts the timer', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { result } = renderHook(() => useNotice())
  act(() => result.current.say('First'))
  act(() => mock.timers.tick(4000))
  act(() => result.current.say('Second'))
  act(() => mock.timers.tick(4000))
  assert.equal(result.current.notice?.text, 'Second')
  act(() => mock.timers.tick(2000))
  assert.equal(result.current.notice, null)
})

test('dismiss clears the notice; say keeps its identity across renders', () => {
  const { result, rerender } = renderHook(() => useNotice())
  const say = result.current.say
  act(() => result.current.say('Hi', { label: 'Undo', run: () => undefined }))
  assert.equal(result.current.notice?.action?.label, 'Undo')
  act(() => result.current.dismiss())
  assert.equal(result.current.notice, null)
  rerender()
  assert.equal(result.current.say, say)
})
