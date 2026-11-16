import { setupWorker } from 'msw/browser'
import { division1Page } from '#modules/division1/index.ts'
import { division2Page } from '#modules/division2/index.ts'
import { division3Page } from '#modules/division3/index.ts'
import { createDb } from './db.ts'
import { createHandlers } from './handlers.ts'

const pages = [division1Page, division2Page, division3Page]

export const worker = setupWorker(
  ...createHandlers(
    createDb(),
    Object.fromEntries(pages.map((p) => [p.id, p.columns.map((c) => c.colId)])),
    { delayMs: 300 },
  ),
)
