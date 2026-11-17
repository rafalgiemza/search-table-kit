import { defineDivision } from '#shared/division/define-division.tsx'
import { division1Page } from './config.ts'

export { division1Page } from './config.ts'

/** Public API of the module (the only entry allowed from outside, see lint). */
export const division1Module = defineDivision({
  id: 'division-1',
  label: 'Division 1',
  order: 1,
  page: division1Page,
})
