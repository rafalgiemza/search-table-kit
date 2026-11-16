import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { emptySelection, toSelection, type SelectionState } from '../../core/selection.ts'
import type {
  ActionResult,
  AnyBulkAction,
  FieldMap,
  Selection,
} from '../../types.ts'

/** Running bulk actions: which confirmation is open, a busy guard, and the call itself. */
export function useBulkActions<TRow, TFields extends FieldMap>({
  runAction,
  selection,
  setSelection,
  count,
  say,
  refresh,
}: {
  runAction: (
    actionId: string,
    selection: Selection<TFields>,
    payload: unknown,
  ) => Promise<ActionResult>
  selection: SelectionState<TFields>
  setSelection: Dispatch<SetStateAction<SelectionState<TFields>>>
  /** Null while "all matching" is being counted; actions wait for the real size. */
  count: number | null
  say: (text: string) => void
  /** Refetch after an action changed the data. */
  refresh: () => void
}) {
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [dialogAction, setDialogAction] = useState<AnyBulkAction<TRow, TFields> | null>(null)
  const [confirming, setConfirming] = useState<AnyBulkAction<TRow, TFields> | null>(null)

  const run = async (
    action: AnyBulkAction<TRow, TFields>,
    payload?: unknown,
    /** For the right-click menu, where state has not caught up with the click yet. */
    override?: Selection<TFields>,
  ) => {
    // Guards the right-click menu too, which does not see the island's disabled buttons.
    if (busyRef.current || (count === null && !override)) return
    busyRef.current = true
    setBusy(true)
    setDialogAction(null)
    setConfirming(null)
    try {
      const result = await runAction(action.id, override ?? toSelection(selection), payload)
      say(result.message)
      setSelection(emptySelection())
      refresh()
    } catch {
      say(`${action.label} failed`)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  /**
   * Starts an action from the right-click menu. Right-clicking a row outside
   * the selection acts on that row alone, so the selection is replaced first.
   */
  const startFromMenu = (action: AnyBulkAction<TRow, TFields>, soloId: string | null) => {
    const solo: Selection<TFields> | undefined =
      soloId === null ? undefined : { mode: 'ids', ids: [soloId] }
    if (soloId !== null) setSelection({ kind: 'ids', ids: new Set([soloId]) })
    if (action.confirm.type === 'none') void run(action, undefined, solo)
    else if (action.confirm.type === 'inline') setConfirming(action)
    else setDialogAction(action)
  }

  return { busy, dialogAction, setDialogAction, confirming, setConfirming, run, startFromMenu }
}
