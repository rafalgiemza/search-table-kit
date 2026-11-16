import { useEffect, useRef, useState, type PointerEvent } from 'react'
import styled from 'styled-components'
import { clampPosition, parsePosition, type Position, type Size } from '../core/island.ts'
import { skipEstimate } from '../core/selection.ts'
import type { AnyBulkAction, FieldMap } from '../types.ts'
import { Button } from './styles.ts'

const Island = styled.div`
  position: absolute;
  z-index: 10;
  left: 50%;
  bottom: 56px;
  transform: translateX(-50%);
  display: flex;
  align-items: stretch;
  background: var(--panel);
  border: 1px solid var(--accent);
  border-radius: 10px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6);
`
const Handle = styled.div`
  display: grid;
  place-items: center;
  width: 24px;
  color: var(--muted);
  cursor: grab;
  touch-action: none;
  user-select: none;
  border-right: 1px solid var(--border);

  &:active { cursor: grabbing; }
`
const Body = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
`
const Status = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
`
const Warning = styled.span`
  color: var(--warning);
  font-size: 12px;
`

type Props<TRow, TFields extends FieldMap> = {
  /** null while the size of an "all matching" selection is unknown; actions are disabled then. */
  count: number | null
  countFailed?: boolean
  actions: readonly AnyBulkAction<TRow, TFields>[]
  /** Loaded rows of the selection; empty for "all matching" selections. */
  rows: readonly TRow[]
  warning?: string
  busy: boolean
  /** Action awaiting inline confirmation; owned by the table so the right-click menu can start it. */
  confirming: AnyBulkAction<TRow, TFields> | null
  onConfirming: (action: AnyBulkAction<TRow, TFields> | null) => void
  onDeselect: () => void
  /** Called for actions that need no further input from the island itself. */
  onRun: (action: AnyBulkAction<TRow, TFields>, payload?: unknown) => void
  onOpenDialog: (action: AnyBulkAction<TRow, TFields>) => void
}

const STORAGE_KEY = 'search-table:island-position'

const readPosition = (): Position | null => {
  try {
    return parsePosition(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return null
  }
}

const savePosition = (position: Position | null) => {
  try {
    if (position) localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: position just is not remembered */
  }
}

/** Absolute positioning is relative to the padding box of the offset parent. */
const boundsOf = (parent: Element): Size => ({ width: parent.clientWidth, height: parent.clientHeight })

/** Floating bar over the grid. Drag it by the handle; position is remembered until the container is resized. */
export function ActionIsland<TRow, TFields extends FieldMap>({
  count,
  countFailed,
  actions,
  rows,
  warning,
  busy,
  confirming,
  onConfirming,
  onDeselect,
  onRun,
  onOpenDialog,
}: Props<TRow, TFields>) {
  const ref = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const actionButtons = useRef(new Map<string, HTMLButtonElement>())
  const restoreFocusTo = useRef<string | null>(null)
  const [position, setPosition] = useState<Position | null>(readPosition)
  const drag = useRef<{ dx: number; dy: number; last: Position | null } | null>(null)

  // A resized container invalidates the remembered spot: go back to the default (bottom-center).
  // The island itself changing size (e.g. inline confirmation text) only needs a clamp to stay reachable.
  useEffect(() => {
    const el = ref.current
    const parent = el?.offsetParent
    if (!el || !parent) return
    let seen: Size | null = null
    const observer = new ResizeObserver(() => {
      const bounds = boundsOf(parent)
      if (seen && (seen.width !== bounds.width || seen.height !== bounds.height)) {
        savePosition(null)
        setPosition(null)
      } else {
        const size = { width: el.offsetWidth, height: el.offsetHeight }
        setPosition((cur) => {
          if (!cur) return cur
          const next = clampPosition(cur, bounds, size)
          return next.x === cur.x && next.y === cur.y ? cur : next
        })
      }
      seen = bounds
    })
    observer.observe(parent)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The action buttons are replaced by the confirmation, so keyboard focus would otherwise be lost.
  useEffect(() => {
    if (confirming?.confirm.type === 'inline') confirmRef.current?.focus()
  }, [confirming])

  // ...and when it closes, hand focus back to the action's button (once the run is no longer busy and
  // disabling it), unless the user already moved focus somewhere else.
  useEffect(() => {
    if (confirming) {
      restoreFocusTo.current = confirming.id
      return
    }
    const id = restoreFocusTo.current
    if (!id || busy) return
    restoreFocusTo.current = null
    const active = document.activeElement
    if (!active || active === document.body) actionButtons.current.get(id)?.focus()
  }, [confirming, busy])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (e.button !== 0 || !el) return
    const box = el.getBoundingClientRect()
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top, last: null }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = ref.current
    const parent = el?.offsetParent
    if (!d || !el || !parent) return
    const origin = parent.getBoundingClientRect()
    const next = clampPosition(
      { x: e.clientX - origin.left - d.dx, y: e.clientY - origin.top - d.dy },
      boundsOf(parent),
      { width: el.offsetWidth, height: el.offsetHeight },
    )
    d.last = next
    setPosition(next)
  }

  /** Persist once per gesture, not on every move. Idempotent: pointerup, cancel and lost capture may all fire. */
  const endDrag = () => {
    const d = drag.current
    drag.current = null
    if (d?.last) savePosition(d.last)
  }

  /** Empty when nothing is known to be skipped; hedged when part of the selection is not loaded. */
  const skipNote = (a: AnyBulkAction<TRow, TFields>) => {
    if (!a.isApplicable) return ''
    const { skipped, complete } = skipEstimate(rows, count ?? Number.POSITIVE_INFINITY, a.isApplicable)
    const reason = a.skippedReason ?? 'not applicable'
    if (complete) return skipped > 0 ? ` (${skipped} will be skipped: ${reason})` : ''
    return ` (${skipped > 0 ? `${skipped}+` : 'some'} may be skipped: ${reason})`
  }

  const start = (a: AnyBulkAction<TRow, TFields>) => {
    if (a.confirm.type === 'none') onRun(a)
    else if (a.confirm.type === 'inline') onConfirming(a)
    else onOpenDialog(a)
  }

  return (
    <Island
      ref={ref}
      role="group"
      aria-label="Selection actions"
      style={position ? { left: position.x, top: position.y, bottom: 'auto', transform: 'none' } : undefined}
    >
      <Handle
        title="Drag to move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <span aria-hidden="true">⠿</span>
      </Handle>

      <Body>
        {/* group, not toolbar: toolbar promises arrow-key navigation, plain Tab order is what we provide */}
        <Status role="status">
          <strong>{count === null ? (countFailed ? 'Count unavailable' : 'Counting…') : `${count} selected`}</strong>
          {warning && <Warning>{warning}</Warning>}
        </Status>

        {confirming && confirming.confirm.type === 'inline' ? (
          <>
            <span role="alert">
              {confirming.confirm.message}
              {skipNote(confirming)}
            </span>
            <Button
              ref={confirmRef}
              type="button"
              $tone={confirming.tone}
              disabled={busy}
              onClick={() => {
                onRun(confirming)
                onConfirming(null)
              }}
            >
              {confirming.confirm.confirmLabel}
            </Button>
            <Button type="button" $ghost onClick={() => onConfirming(null)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button type="button" $ghost onClick={onDeselect}>
              Deselect
            </Button>
            {actions.map((a, i) => (
              <Button
                key={a.id}
                ref={(el) => {
                  if (el) actionButtons.current.set(a.id, el)
                  else actionButtons.current.delete(a.id)
                }}
                type="button"
                $tone={a.tone}
                // The last action is the call to action, unless it is destructive.
                $primary={a.tone !== 'danger' && i === actions.length - 1}
                disabled={busy || count === null}
                onClick={() => start(a)}
              >
                {a.icon}
                {a.label}
              </Button>
            ))}
          </>
        )}
      </Body>
    </Island>
  )
}
