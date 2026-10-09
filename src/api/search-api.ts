import type {
  ActionResult,
  FetchRows,
  FieldMap,
  Selection,
  SearchResult,
} from '../search-table/types.ts'

const post = async <T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`)
  return response.json() as Promise<T>
}

/** The callbacks a page hands to the table. The table itself never fetches. */
export const createSearchApi = <TRow, TFields extends FieldMap>(division: string) => ({
  fetchRows: ((query, signal) =>
    post<SearchResult<TRow>>(`/api/divisions/${division}/items/search`, query, signal)) as FetchRows<
    TRow,
    TFields
  >,
  runAction: (actionId: string, selection: Selection<TFields>, payload: unknown) =>
    post<ActionResult>(`/api/divisions/${division}/actions/${actionId}`, {
      selection,
      payload,
    }),
})
