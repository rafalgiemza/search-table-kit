import { setupWorker } from 'msw/browser'
import { division1, division2, division3 } from '../divisions/pages.ts'
import { createDb } from './db.ts'
import { createHandlers } from './handlers.ts'

const pages = [division1, division2, division3]

export const worker = setupWorker(
  ...createHandlers(
    createDb(),
    Object.fromEntries(pages.map((p) => [p.id, p.columns.map((c) => c.colId)])),
    { delayMs: 300 },
  ),
)
