import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { setupServer } from 'msw/node'
import { createDb, generateItems } from './db.ts'
import { filterAndSort } from './engine.ts'
import { createHandlers } from './handlers.ts'

const items = generateItems()
const none = { search: '', filters: {}, sort: [] }

test('data is deterministic and has 200 items', () => {
  assert.equal(items.length, 200)
  assert.deepEqual(generateItems()[5], items[5])
})

test('filters combine with AND, search is case-insensitive', () => {
  const sent = filterAndSort(items, {
    ...none,
    filters: { status: { condition: 'in', values: ['sent'] } },
  })
  assert.ok(sent.length > 0 && sent.every((i) => i.status === 'sent'))
  const narrowed = filterAndSort(items, {
    search: 'WELD',
    filters: { status: { condition: 'in', values: ['sent'] } },
    sort: [],
  })
  assert.ok(narrowed.every((i) => i.status === 'sent' && /weld/i.test(i.description)))
  assert.ok(narrowed.length < sent.length)
})

test('idList accepts a prefix', () => {
  const out = filterAndSort(items, {
    ...none,
    filters: { id: { condition: 'in', values: ['001', '002'], prefix: 'ITM-' } },
  })
  assert.deepEqual(out.map((i) => i.id), ['ITM-001', 'ITM-002'])
})

test('multi-column sort respects column order', () => {
  const out = filterAndSort(items, {
    ...none,
    sort: [
      { colId: 'status', direction: 'asc' },
      { colId: 'id', direction: 'desc' },
    ],
  })
  for (let i = 1; i < out.length; i++) {
    const [a, b] = [out[i - 1]!, out[i]!]
    assert.ok(a.status < b.status || (a.status === b.status && a.id > b.id))
  }
})

const server = setupServer(
  ...createHandlers(createDb(generateItems()), {
    'division-1': ['id', 'status'],
    'division-2': ['id', 'notes'],
  }, { baseUrl: 'http://localhost' }),
)
before(async () => {
  await server.listen({ onUnhandledFrame: 'error' })
})
after(async () => {
  await server.close()
})

const post = (url: string, body: unknown) =>
  fetch(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

test('search endpoint pages and projects to the division keys', async () => {
  const res = await post('/api/divisions/division-2/items/search', {
    ...none,
    startRow: 50,
    endRow: 100,
  })
  const body = (await res.json()) as { rows: Record<string, unknown>[]; total: number }
  assert.equal(body.total, 200)
  assert.equal(body.rows.length, 50)
  assert.deepEqual(Object.keys(body.rows[0]!), ['id', 'notes'])
  assert.equal(body.rows[0]!.id, 'ITM-051')
})

test('unknown division is a 404', async () => {
  const res = await post('/api/divisions/nope/items/search', { ...none, startRow: 0, endRow: 1 })
  assert.equal(res.status, 404)
})

test('reject skips sent rows and works on "all matching"', async () => {
  const res = await post('/api/divisions/division-1/actions/reject', {
    selection: { mode: 'criteria', criteria: none, excludedIds: [] },
    payload: undefined,
  })
  const result = (await res.json()) as { affected: number; skipped: number }
  const blocked = items.filter((i) => i.status === 'sent' || i.status === 'rejected').length
  assert.equal(result.skipped, blocked)
  assert.equal(result.affected, 200 - blocked)
})
