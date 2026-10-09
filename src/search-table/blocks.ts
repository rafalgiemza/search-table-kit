import type { ColDef } from 'ag-grid-community'
import type {
  FieldDef,
  FilterKind,
  SearchColumn,
  SearchPageConfig,
} from './types.ts'

/**
 * A block is one reusable piece of a page: a row property, its column and,
 * optionally, its filter. Pages are composed from blocks, so each page gets
 * its own row shape and filter set without any copy-paste.
 *
 * `_value` and `_kind` are phantom types: they exist only for inference.
 */
export type Block<
  TKey extends string = string,
  TValue = unknown,
  TKind extends FilterKind = never,
> = {
  key: TKey
  column: Omit<ColDef<Record<TKey, TValue>>, 'field' | 'colId'>
  filter?: [TKind] extends [never] ? undefined : FieldDef<TKind>
  _value?: TValue
  _kind?: TKind
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlock = Block<string, any, any>

/**
 * `block<Status>()({ key: 'status', filter: { kind: 'multiSelect', ... } })`.
 * The value type is explicit, the key and filter kind are inferred.
 */
export const block =
  <TValue>() =>
  <TKey extends string, TKind extends FilterKind = never>(def: {
    key: TKey
    column: Block<TKey, TValue, TKind>['column']
    filter?: FieldDef<TKind>
  }): Block<TKey, TValue, TKind> => def as Block<TKey, TValue, TKind>

/** Row shape: one property per block. */
export type RowOf<TBlocks extends readonly AnyBlock[]> = {
  [B in TBlocks[number] as B['key']]: NonNullable<B['_value']>
}

/** Filter fields: one per block that declares a filter. */
export type FieldsOf<TBlocks extends readonly AnyBlock[]> = {
  [B in TBlocks[number] as [NonNullable<B['_kind']>] extends [never]
    ? never
    : B['key']]: NonNullable<B['_kind']>
}

export type PageOptions<TBlocks extends readonly AnyBlock[]> = Omit<
  SearchPageConfig<RowOf<TBlocks>, FieldsOf<TBlocks>>,
  'fields' | 'columns' | 'getRowId'
> & {
  blocks: TBlocks
  /** Block key holding the row id. */
  idKey: Extract<TBlocks[number]['key'], string>
}

/**
 * Identity helper for a page's options kept in their own file: it keeps
 * inference (row type in `isSelectable`, filter ids in `criteriaPredicate`)
 * that a plain `const` object would lose.
 */
export const pageOptions = <const TBlocks extends readonly AnyBlock[]>(
  options: PageOptions<TBlocks>,
): PageOptions<TBlocks> => options

/** Composes a page config from blocks; the casts below are the only ones. */
export const definePage = <const TBlocks extends readonly AnyBlock[]>(
  options: PageOptions<TBlocks>,
): SearchPageConfig<RowOf<TBlocks>, FieldsOf<TBlocks>> => {
  const { blocks, idKey, ...rest } = options
  type Row = RowOf<TBlocks>
  type Fields = FieldsOf<TBlocks>

  const fields: Record<string, FieldDef> = {}
  const columns: SearchColumn<Row, Fields>[] = []

  for (const b of blocks) {
    if (b.filter) fields[b.key] = b.filter
    columns.push({
      ...b.column,
      colId: b.key,
      field: b.key,
      filterField: b.filter ? b.key : undefined,
    } as SearchColumn<Row, Fields>)
  }

  return {
    ...rest,
    getRowId: (row) => String((row as Record<string, unknown>)[idKey]),
    fields: fields as SearchPageConfig<Row, Fields>['fields'],
    columns,
  }
}
