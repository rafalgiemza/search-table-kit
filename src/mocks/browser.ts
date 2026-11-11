import { setupWorker } from 'msw/browser'
import { pages } from '../divisions/registry.ts'
import { createDb } from './db.ts'
import { createHandlers } from './handlers.ts'

export const worker = setupWorker(
  ...createHandlers(
    createDb(),
    Object.fromEntries(pages.map((p) => [p.id, p.columns.map((c) => c.colId)])),
    { delayMs: 300 },
  ),
)
