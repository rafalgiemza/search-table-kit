import type { ColDef, MenuItemDef } from 'ag-grid-community'
import type { ComponentType, ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Filter kinds                                                               */
/* -------------------------------------------------------------------------- */

export type QuickDateRange =
  | 'today'
  | 'next7days'
  | 'beforeToday'
  | 'thisMonth'
  | 'last30days'

/** ISO date, `YYYY-MM-DD`. */
export type IsoDate = string

export type DateFilterValue =
  | { condition: 'between'; from?: IsoDate; to?: IsoDate }
  | { condition: 'before'; date: IsoDate }
  | { condition: 'after'; date: IsoDate }
  | { condition: 'isEmpty' }
  /**
   * `relative: true` keeps the range symbolic, so a saved view recalculates
   * it on every load. The server receives it resolved to `between`.
   */
  | { condition: 'quick'; range: QuickDateRange; relative: boolean }

/**
 * Registry of filter kinds: kind -> shape of the value the user builds.
 * Extend it from a page with declaration merging to add a kind
 * (together with an entry in the filter-kind registry that renders it).
 */
export interface FilterKinds {
  text: { condition: 'contains' | 'equals'; value: string }
  multiSelect: { condition: 'in' | 'notIn'; values: string[] }
  idList: { condition: 'in'; values: string[]; prefix?: string }
  date: DateFilterValue
  boolean: { condition: 'is'; value: boolean }
}

export type FilterKind = keyof FilterKinds

/** Conditions a kind can use, e.g. `ConditionOf<'date'>` = 'between' | 'before' | ... */
export type ConditionOf<K extends FilterKind> = FilterKinds[K]['condition']

/* -------------------------------------------------------------------------- */
/*  Fields (what can be filtered)                                              */
/* -------------------------------------------------------------------------- */

/**
 * Maps field id -> filter kind. Declared once per page and threaded through
 * every type below, so `filters.status` is `FilterKinds['multiSelect']`
 * and a typo in a field id is a compile error.
 *
 *   type ItemFields = { id: 'idList'; entity: 'multiSelect'; endDate: 'date' }
 */
export type FieldMap = Record<string, FilterKind>

export type FieldId<TFields extends FieldMap> = Extract<keyof TFields, string>

export type FilterOption = {
  value: string
  label: string
  /** Colour token for badges, e.g. the Done statuses. */
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}

export type FieldDef<K extends FilterKind = FilterKind> = {
  kind: K
  label: string
  /** Short hint in the "+ Filter" picker: "pick one or more", "paste a list". */
  hint: string
  /** Subset of conditions to offer. Defaults to all conditions of the kind. */
  conditions?: readonly ConditionOf<K>[]
  /** Required for `multiSelect`; static list or async loader. */
  options?: readonly FilterOption[] | (() => Promise<readonly FilterOption[]>)
  /** Replaces the built-in editor for this kind (extension point). */
  editor?: ComponentType<FilterEditorProps<K>>
}

export type FieldDefs<TFields extends FieldMap> = {
  [Id in FieldId<TFields>]: FieldDef<TFields[Id]>
}

export type FilterEditorProps<K extends FilterKind> = {
  field: FieldDef<K>
  value: FilterKinds[K] | undefined
  onChange: (next: FilterKinds[K]) => void
  onClose: () => void
}

/** Current filters, one entry per active field. */
export type FilterState<TFields extends FieldMap> = {
  [Id in FieldId<TFields>]?: FilterKinds[TFields[Id]]
}

/* -------------------------------------------------------------------------- */
/*  Query (the shared search contract with the backend)                        */
/* -------------------------------------------------------------------------- */

export type SortDirection = 'asc' | 'desc'

/** What defines a result set, independent of paging. */
export type SearchCriteria<TFields extends FieldMap> = {
  /** Always-visible search box (description). */
  search: string
  filters: FilterState<TFields>
  sort: readonly { colId: string; direction: SortDirection }[]
}

/** Criteria plus the window the grid asked for. */
export type SearchQuery<TFields extends FieldMap> = SearchCriteria<TFields> & {
  startRow: number
  endRow: number
}

export type SearchResult<TRow> = {
  rows: TRow[]
  /** Total number of rows matching the criteria, across all pages. */
  total: number
}

export type FetchRows<TRow, TFields extends FieldMap> = (
  query: SearchQuery<TFields>,
  signal: AbortSignal,
) => Promise<SearchResult<TRow>>

/* -------------------------------------------------------------------------- */
/*  Columns                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * AG Grid's `ColDef` plus the link to the filter field. When `filterField`
 * is set, the header shows a filter icon while that filter is active.
 */
export type SearchColumn<TRow, TFields extends FieldMap> = ColDef<TRow> & {
  colId: string
  filterField?: FieldId<TFields>
}

/* -------------------------------------------------------------------------- */
/*  Selection and bulk actions                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Selection is either an explicit id list, or "everything matching the
 * criteria" minus exclusions, so the backend can act on the filter and
 * not on thousands of ids ("select all matching").
 */
export type Selection<TFields extends FieldMap> =
  | { mode: 'ids'; ids: readonly string[] }
  | {
      mode: 'criteria'
      criteria: SearchCriteria<TFields>
      excludedIds: readonly string[]
    }

export type ActionResult = {
  /** Shown in the confirmation toast. */
  message: string
  affected?: number
  skipped?: number
}

export type ActionDialogProps<TRow, TFields extends FieldMap, TPayload> = {
  /** Loaded rows of the selection (may be a subset in `criteria` mode). */
  rows: readonly TRow[]
  /** Subset of `rows` the action will skip (`isApplicable` returned false). */
  skippedRows: readonly TRow[]
  selection: Selection<TFields>
  onRemoveRow: (id: string) => void
  onConfirm: (payload: TPayload) => void
  onCancel: () => void
}

export type BulkAction<TRow, TFields extends FieldMap, TPayload = void> = {
  id: string
  label: string
  tone?: 'default' | 'danger'
  icon?: ReactNode
  /** Rows for which this returns false are skipped and listed in the warning. */
  isApplicable?: (row: TRow) => boolean
  /** Why rows are skipped, e.g. "already sent or rejected". */
  skippedReason?: string
  /**
   * `inline`  - confirm inside the floating bar (Reject).
   * `dialog`  - open a modal and collect a payload (Send: Draft / Publish).
   * `none`    - run immediately.
   */
  confirm:
    | { type: 'none' }
    | { type: 'inline'; message: string; confirmLabel: string }
    | {
        type: 'dialog'
        Dialog: ComponentType<ActionDialogProps<TRow, TFields, TPayload>>
      }
}

/** Type-erased form stored in the config array (see `defineAction`). */
export type AnyBulkAction<TRow, TFields extends FieldMap> = BulkAction<
  TRow,
  TFields,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>

/** Keeps `TPayload` checked inside one action, then erases it for the list. */
export const defineAction = <TRow, TFields extends FieldMap, TPayload = void>(
  action: BulkAction<TRow, TFields, TPayload>,
): AnyBulkAction<TRow, TFields> => action

/* -------------------------------------------------------------------------- */
/*  Saved views                                                                */
/* -------------------------------------------------------------------------- */

export type ViewLayout = {
  columnOrder?: readonly string[]
  columnWidths?: Readonly<Record<string, number>>
}

export type SavedView<TFields extends FieldMap> = {
  id: string
  name: string
  isDefault: boolean
  /** Bumped when the page's fields change; old views drop unknown filters. */
  schemaVersion: number
  criteria: Pick<SearchCriteria<TFields>, 'search' | 'filters'>
  /** Present only if the user chose to save sort and layout with the view. */
  sort?: SearchCriteria<TFields>['sort']
  layout?: ViewLayout
}

/** localStorage today, backend later. Keyed by page, so pages never collide. */
export type ViewStorage<TFields extends FieldMap> = {
  list: (pageId: string) => Promise<SavedView<TFields>[]>
  save: (pageId: string, view: SavedView<TFields>) => Promise<void>
  remove: (pageId: string, viewId: string) => Promise<void>
}

/* -------------------------------------------------------------------------- */
/*  Extension points                                                           */
/* -------------------------------------------------------------------------- */

export type RowMenuContext<TRow, TFields extends FieldMap> = {
  /** Right-click on a selected row -> whole selection; otherwise just that row. */
  rows: readonly TRow[]
  selection: Selection<TFields>
  /** Opens the page's `DetailsDialog` for the given rows. */
  openDetails: (rows: readonly TRow[]) => void
}

/**
 * The only places a page may differ from the shared behaviour. Anything else
 * should be a change to the shared component, not a copy of it.
 */
export type SearchPageExtensions<TRow, TFields extends FieldMap> = {
  /** Extra items for the right-click menu, before AG Grid's Copy / Export. */
  rowMenuItems?: (ctx: RowMenuContext<TRow, TFields>) => MenuItemDef[]
  /** Replaces the floating selection bar contents. */
  SelectionBar?: ComponentType<{
    selection: Selection<TFields>
    selectedRows: readonly TRow[]
    clear: () => void
  }>
  /** Opened by `rowMenuItems` or the selection bar, e.g. Epics "Show details". */
  DetailsDialog?: ComponentType<{ rows: readonly TRow[]; onClose: () => void }>
}

/* -------------------------------------------------------------------------- */
/*  Page config                                                                */
/* -------------------------------------------------------------------------- */

/** How rows may be selected on a page. */
export type SelectionPolicy<TRow, TFields extends FieldMap> = {
  mode: 'none' | 'single' | 'multiple'
  /** Per-row rule for the grid, e.g. only rows with status "done". */
  isSelectable?: (row: TRow) => boolean
  /**
   * The same rule as a filter, AND-ed into the criteria of a "select all
   * matching" selection. The backend never sees rows there, so a function
   * alone cannot enforce the rule.
   */
  criteriaPredicate?: FilterState<TFields>
}

/**
 * Static description of a page: no data fetching, no side effects. Built
 * from shared blocks with `definePage`, so it is safe to import anywhere.
 */
export type SearchPageConfig<TRow, TFields extends FieldMap> = {
  /** Namespaces saved views and layout state. */
  id: string
  title: string
  getRowId: (row: TRow) => string

  fields: FieldDefs<TFields>
  columns: readonly SearchColumn<TRow, TFields>[]

  selection?: SelectionPolicy<TRow, TFields>
  actions?: readonly AnyBulkAction<TRow, TFields>[]

  /** Shipped views, available before the user saves anything. */
  defaultViews?: readonly SavedView<TFields>[]
  viewsSchemaVersion?: number

  pageSizes?: readonly number[]
  defaultPageSize?: number

  extensions?: SearchPageExtensions<TRow, TFields>
}

/**
 * The table is a dumb component: it knows the layout and waits for a config.
 * Everything that touches the outside world is handed in by the parent.
 */
export type SearchTableProps<TRow, TFields extends FieldMap> = {
  config: SearchPageConfig<TRow, TFields>
  fetchRows: FetchRows<TRow, TFields>
  /** Executes a bulk action; the table only decides when and with what. */
  runAction: (
    actionId: string,
    selection: Selection<TFields>,
    payload: unknown,
  ) => Promise<ActionResult>
  /** Count shown next to each saved view; omit to hide counts. */
  fetchViewCount?: (view: SavedView<TFields>) => Promise<number>
  viewStorage?: ViewStorage<TFields>
}
