import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { AnyBulkAction, FieldMap } from '../types.ts'

type Props<TRow, TFields extends FieldMap> = {
  count: number
  actions: readonly AnyBulkAction<TRow, TFields>[]
  /** Loaded rows of the selection; empty for "all matching" selections. */
  rows: readonly TRow[]
  warning?: string
  busy: boolean
  onDeselect: () => void
  /** Called for actions that need no further input from the island itself. */
  onRun: (action: AnyBulkAction<TRow, TFields>, payload?: unknown) => void
  onOpenDialog: (action: AnyBulkAction<TRow, TFields>) => void
}

type Position = { x: number; y: number }
const STORAGE_KEY = 'search-table:island-position'

const readPosition = (): Position | null => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

/** Floating bar over the grid. Drag it by the handle; position is remembered. */
export function ActionIsland<TRow, TFields extends FieldMap>({
  count,
  actions,
  rows,
  warning,
  busy,
  onDeselect,
  onRun,
  onOpenDialog,
}: Props<TRow, TFields>) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position | null>(readPosition)
  const [confirming, setConfirming] = useState<AnyBulkAction<TRow, TFields> | null>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    try {
      if (position) localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    } catch {
      /* storage unavailable: position just is not remembered */
    }
  }, [position])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const box = ref.current!.getBoundingClientRect()
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const el = ref.current!
    const parent = el.offsetParent!.getBoundingClientRect()
    const x = e.clientX - parent.left - drag.current.dx
    const y = e.clientY - parent.top - drag.current.dy
    setPosition({
      x: Math.min(Math.max(0, x), parent.width - el.offsetWidth),
      y: Math.min(Math.max(0, y), parent.height - el.offsetHeight),
    })
  }

  const skipped = (a: AnyBulkAction<TRow, TFields>) =>
    a.isApplicable ? rows.filter((r) => !a.isApplicable!(r)).length : 0

  const start = (a: AnyBulkAction<TRow, TFields>) => {
    if (a.confirm.type === 'none') onRun(a)
    else if (a.confirm.type === 'inline') setConfirming(a)
    else onOpenDialog(a)
  }

  return (
    <div
      ref={ref}
      className="island"
      role="toolbar"
      aria-label="Selection actions"
      style={position ? { left: position.x, top: position.y, bottom: 'auto', transform: 'none' } : undefined}
    >
      <div
        className="island__handle"
        title="Drag to move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
      >
        ⠿
      </div>

      <div className="island__body">
        <strong>{count} selected</strong>
        {warning && <span className="island__warning">{warning}</span>}

        {confirming && confirming.confirm.type === 'inline' ? (
          <>
            <span>
              {confirming.confirm.message}
              {skipped(confirming) > 0 && ` (${skipped(confirming)} will be skipped: ${confirming.skippedReason ?? 'not applicable'})`}
            </span>
            <button
              type="button"
              className={`btn btn--${confirming.tone ?? 'default'}`}
              disabled={busy}
              onClick={() => {
                onRun(confirming)
                setConfirming(null)
              }}
            >
              {confirming.confirm.confirmLabel}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(null)}>
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
