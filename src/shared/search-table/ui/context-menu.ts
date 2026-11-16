import type { DefaultMenuItem, GetContextMenuItemsParams, MenuItemDef } from 'ag-grid-community'
import { planRowMenu } from '../core/row-menu.ts'
import type { SelectionState } from '../core/selection.ts'
import type { AnyBulkAction, FieldMap, SearchPageConfig } from '../types.ts'

/** AG Grid adapter for `planRowMenu`: the plan decides, this only builds menu items. */
export const buildContextMenu = <TRow, TFields extends FieldMap>({
  params,
  config,
  selection,
  selectedRows,
  selectMode,
  isSelectable,
  busy,
  count,
  startFromMenu,
  openDetails,
}: {
  params: GetContextMenuItemsParams<TRow>
  config: SearchPageConfig<TRow, TFields>
  selection: SelectionState<TFields>
  selectedRows: readonly TRow[]
  selectMode: 'none' | 'single' | 'multiple'
  isSelectable: (row: TRow) => boolean
  busy: boolean
  count: number | null
  startFromMenu: (action: AnyBulkAction<TRow, TFields>, soloId: string | null) => void
  openDetails: (rows: readonly TRow[]) => void
}): (MenuItemDef<TRow> | DefaultMenuItem)[] => {
  const standard: DefaultMenuItem[] = ['copy', 'copyWithHeaders', 'paste', 'separator', 'export']
  const clicked = params.node?.data
  if (clicked === undefined) return standard

  const id = config.getRowId(clicked)
  const plan = planRowMenu({
    clicked,
    id,
    selection,
    selectedRows,
    actions: config.actions ?? [],
    selectMode,
    clickedSelectable: isSelectable(clicked),
    busy,
    count,
  })

  const custom: (MenuItemDef<TRow> | DefaultMenuItem)[] =
    config.extensions?.rowMenuItems?.({
      rows: plan.rows,
      selection: plan.selection,
      openDetails,
    }) ?? []

  const actionItems: MenuItemDef<TRow>[] = plan.actions.map((a) => ({
    name: a.label,
    disabled: a.disabled,
    tooltip: a.tooltip,
    action: () => startFromMenu(a.action, plan.inSelection ? null : id),
  }))

  const groups = [custom, actionItems, standard].filter((g) => g.length > 0)
  return groups.flatMap((g, i) => (i === 0 ? g : ['separator' as const, ...g]))
}
