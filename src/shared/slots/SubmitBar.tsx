import { useRef, useState, type PointerEvent } from 'react'
import styled from 'styled-components'
import { clampPosition, type Position } from '../../search-table/core/island.ts'
import { Button } from '../../search-table/ui/styles.ts'

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
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
`
const Dialog = styled.div`
  min-width: 360px;
  padding: 18px;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;

  & h2 { margin: 0 0 12px; font-size: 16px; }
`

/**
 * Division 3's hardcoded selection bar: a draggable island with a counter, Deselect and Submit.
 * Position is not remembered; the modal is a placeholder for whatever Submit should do.
 */
export function SubmitBar({ selectedRows, clear }: { selectedRows: readonly unknown[]; clear: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const grab = useRef<Position | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [open, setOpen] = useState(false)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (e.button !== 0 || !el) return
    const box = el.getBoundingClientRect()
    grab.current = { x: e.clientX - box.left, y: e.clientY - box.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    const parent = el?.offsetParent
    if (!grab.current || !el || !parent) return
    const origin = parent.getBoundingClientRect()
    setPosition(
      clampPosition(
        { x: e.clientX - origin.left - grab.current.x, y: e.clientY - origin.top - grab.current.y },
        { width: parent.clientWidth, height: parent.clientHeight },
        { width: el.offsetWidth, height: el.offsetHeight },
      ),
    )
  }

  const endDrag = () => {
    grab.current = null
  }

  return (
    <>
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
          <strong role="status">{selectedRows.length} selected</strong>
          <Button type="button" $ghost onClick={clear}>
            Deselect
          </Button>
          <Button type="button" $primary onClick={() => setOpen(true)}>
            Submit
          </Button>
        </Body>
      </Island>

      {open && (
        <Overlay>
          <Dialog role="dialog" aria-modal="true" aria-label="Submit">
            <h2>Submit {selectedRows.length} items</h2>
            <Button type="button" $ghost onClick={() => setOpen(false)}>
              Close
            </Button>
          </Dialog>
        </Overlay>
      )}
    </>
  )
}
