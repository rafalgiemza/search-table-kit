import { http, HttpResponse } from 'msw'
import type {
  ActionResult,
  Selection,
  SearchQuery,
  SearchResult,
} from '../search-table/types.ts'
import type { MockDb, MockItem } from './db.ts'
import { filterAndSort, window } from './engine.ts'

/** division id -> row keys the division exposes (taken from its page config). */
export type DivisionKeys = Readonly<Record<string, readonly string[]>>

const project = (item: MockItem, keys: readonly string[]) =>
  Object.fromEntries(keys.map((k) => [k, item[k as keyof MockItem]]))

const resolveIds = (db: MockDb, selection: Selection<never>) =>
  selection.mode === 'ids'
    ? new Set(selection.ids)
    : new Set(
        filterAndSort(db.items, selection.criteria)
          .map((i) => i.id)
          .filter((id) => !selection.excludedIds.includes(id)),
      )

/** Per-action rules; the real backend owns these, the table only shows them. */
const actions: Record<
  string,
  { applies: (i: MockItem) => boolean; apply: (i: MockItem, payload: unknown) => void; verb: string }
> = {
  send: {
    verb: 'sent',
    applies: (i) => i.status === 'draft' || i.status === 'pending',
    apply: (i, payload) => {
      i.status = (payload as { mode?: string } | undefined)?.mode === 'draft' ? 'draft' : 'sent'
    },
  },
  reject: {
    verb: 'rejected',
    applies: (i) => i.status !== 'sent' && i.status !== 'rejected',
    apply: (i) => {
      i.status = 'rejected'
    },
  },
}

/** `baseUrl` is empty in the browser; Node tests need an absolute origin. */
export const createHandlers = (
  db: MockDb,
  divisions: DivisionKeys,
  { delayMs = 0, baseUrl = '' }: { delayMs?: number; baseUrl?: string } = {},
) => {
  const wait = () => (delayMs ? new Promise((r) => setTimeout(r, delayMs)) : undefined)
  const keysFor = (division: unknown) => divisions[String(division)]

  return [
    http.post(`${baseUrl}/api/divisions/:division/items/search`, async ({ params, request }) => {
      const keys = keysFor(params.division)
      if (!keys) return new HttpResponse(null, { status: 404 })
      await wait()
      const query = (await request.json()) as SearchQuery<never>
      const matching = filterAndSort(db.items, query)
      const body: SearchResult<Record<string, unknown>> = {
        rows: window(matching, query.startRow, query.endRow).map((i) => project(i, keys)),
        total: matching.length,
      }
      return HttpResponse.json(body)
    }),

    http.post(`${baseUrl}/api/divisions/:division/actions/:actionId`, async ({ params, request }) => {
      const action = actions[String(params.actionId)]
      if (!keysFor(params.division) || !action) return new HttpResponse(null, { status: 404 })
      await wait()
      const { selection, payload } = (await request.json()) as {
        selection: Selection<never>
        payload: unknown
      }
      const ids = resolveIds(db, selection)
      const targets = db.items.filter((i) => ids.has(i.id))
      const applicable = targets.filter(action.applies)
      applicable.forEach((i) => action.apply(i, payload))
      const result: ActionResult = {
        message: `${applicable.length} ${action.verb}, ${targets.length - applicable.length} skipped`,
        affected: applicable.length,
        skipped: targets.length - applicable.length,
      }
      return HttpResponse.json(result)
    }),
  ]
}
