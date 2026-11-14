import type { AnyBulkAction, FieldMap, Selection } from '../types.ts'
import { isSelected, toSelection, type SelectionState } from './selection.ts'

export type MenuActionPlan<TRow, TFields extends FieldMap> = {
  action: AnyBulkAction<TRow, TFields>
  label: string
  disabled: boolean
  tooltip?: string
}

export type RowMenuPlan<TRow, TFields extends FieldMap> = {
  /** Right-click on a selected row -> whole selection; otherwise just that row. */
  rows: readonly TRow[]
  selection: Selection<TFields>
  inSelection: boolean
  actions: MenuActionPlan<TRow, TFields>[]
}

/**
 * What the right-click menu offers for one row. Each bulk action has its own
 * rule (`isApplicable`), independent of whether the row may be ticked;
 * "all matching" cannot be counted here, so it is only disabled while its
 * size is unknown.
 */
export const planRowMenu = <TRow, TFields extends FieldMap>(input: {
  clicked: TRow
  id: string
  selection: SelectionState<TFields>
  selectedRows: readonly TRow[]
  actions: readonly AnyBulkAction<TRow, TFields>[]
  selectMode: 'none' | 'single' | 'multiple'
  clickedSelectable: boolean
  busy: boolean
  /** Size of the current selection; null while "all matching" is being counted. */
  count: number | null
}): RowMenuPlan<TRow, TFields> => {
  const { clicked, id, selection, selectedRows, actions, selectMode, busy, count } = input
  const inSelection = isSelected(selection, id)
  const rows = inSelection && selection.kind === 'ids' ? selectedRows : [clicked]
  const menuSelection: Selection<TFields> = inSelection
    ? toSelection(selection)
    : { mode: 'ids', ids: [id] }

  const canAct = selectMode !== 'none' && (inSelection || input.clickedSelectable)
  const planned = !canAct
    ? []
    : actions
        .filter((a) => a.contextMenu !== false)
        .map((action) => {
          const applicable = action.isApplicable
            ? rows.filter(action.isApplicable).length
            : rows.length
          const partial = selection.kind === 'ids' && rows.length > 1 && applicable < rows.length
          return {
            action,
            label: partial ? `${action.label} (${applicable} of ${rows.length})` : action.label,
            disabled:
              busy ||
              (inSelection && count === null) ||
              (selection.kind === 'ids' || !inSelection ? applicable === 0 : false),
            tooltip:
              applicable === 0
                ? `Not applicable: ${action.skippedReason ?? 'rows do not qualify'}`
                : undefined,
          }
        })

  return { rows, selection: menuSelection, inSelection, actions: planned }
}
