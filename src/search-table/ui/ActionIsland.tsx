import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { clampPosition, parsePosition, type Position, type Size } from '../core/island.ts'
import { skipEstimate } from '../core/selection.ts'
import type { AnyBulkAction, FieldMap } from '../types.ts'

type Props<TRow, TFields extends FieldMap> = {
  count: number
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
    const { skipped, complete } = skipEstimate(rows, count, a.isApplicable)
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
    <div
      ref={ref}
      className="island"
      role="group"
      aria-label="Selection actions"
      style={position ? { left: position.x, top: position.y, bottom: 'auto', transform: 'none' } : undefined}
    >
      <div
        className="island__handle"
        title="Drag to move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <span aria-hidden="true">⠿</span>
      </div>

      <div className="island__body">
        {/* group, not toolbar: toolbar promises arrow-key navigation, plain Tab order is what we provide */}
        <span role="status" className="island__status">
          <strong>{count} selected</strong>
          {warning && <span className="island__warning">{warning}</span>}
        </span>

        {confirming && confirming.confirm.type === 'inline' ? (
          <>
            <span role="alert">
              {confirming.confirm.message}
              {skipNote(confirming)}
            </span>
            <button
              ref={confirmRef}
              type="button"
              className={`btn btn--${confirming.tone ?? 'default'}`}
              disabled={busy}
              onClick={() => {
                onRun(confirming)
                onConfirming(null)
              }}
            >
              {confirming.confirm.confirmLabel}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onConfirming(null)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--ghost" onClick={onDeselect}>
              Deselect
            </button>
            {actions.map((a) => (
              <button
                key={a.id}
                ref={(el) => {
                  if (el) actionButtons.current.set(a.id, el)
                  else actionButtons.current.delete(a.id)
                }}
                type="button"
                className={`btn btn--${a.tone ?? 'default'}`}
                disabled={busy}
                onClick={() => start(a)}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
