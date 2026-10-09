import { useState } from 'react'
import type { ActionDialogProps, FieldMap } from '../../search-table/types.ts'
import { Button, Controls, LinkButton, Pill } from '../../search-table/ui/styles.ts'

export type SendPayload = { mode: 'draft' | 'publish' }

type Row = { id: string; description: string }

/** Lists what will be sent, what is skipped, and asks Draft or Publish. */
export function SendDialog<TRow extends Row, TFields extends FieldMap>({
  rows,
  skippedRows,
  count,
  selection,
  onRemoveRow,
  onConfirm,
  onCancel,
}: ActionDialogProps<TRow, TFields, SendPayload>) {
  const [mode, setMode] = useState<SendPayload['mode']>('draft')
  const skippedIds = new Set(skippedRows.map((r) => r.id))
  const sendable = rows.filter((r) => !skippedIds.has(r.id))
  // Rows that left the loaded window still count as selected, but cannot be listed.
  const notShown = Math.max(0, count - rows.length)

  return (
    <div role="dialog" aria-label="Send items">
      <h2>Send items</h2>
      {selection.mode === 'criteria' ? (
        <p>
          All {count} matching items will be sent; the server skips ineligible ones (already sent or
          rejected) and reports how many.
        </p>
      ) : (
        <>
          <ul>
            {sendable.map((r) => (
              <li key={r.id}>
                <span>{r.id} · {r.description}</span>
                <LinkButton type="button" onClick={() => onRemoveRow(r.id)}>
                  Remove
                </LinkButton>
              </li>
            ))}
          </ul>
          {notShown > 0 && (
            <p>
              + {notShown} more selected, not loaded here; the server skips ineligible ones (already
              sent or rejected).
            </p>
          )}
          {skippedRows.length > 0 && (
            <p>
              Skipped (already sent or rejected): {skippedRows.map((r) => r.id).join(', ')}
            </p>
          )}
        </>
      )}
      <Controls>
        {(['draft', 'publish'] as const).map((m) => (
          <Pill
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'draft' ? 'Draft' : 'Publish'}
          </Pill>
        ))}
      </Controls>
      <footer>
        <Button type="button" $ghost onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onConfirm({ mode })}>
          {mode === 'draft' ? 'Send as draft' : 'Publish'}
        </Button>
      </footer>
    </div>
  )
}
