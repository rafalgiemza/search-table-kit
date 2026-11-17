import { defineDivision } from '#shared/division/define-division.tsx'
import { division3Page } from './config.ts'

export { division3Page } from './config.ts'

/** Public API of the module (the only entry allowed from outside, see lint). */
export const division3Module = defineDivision({
  id: 'division-3',
  label: 'Division 3',
  order: 3,
  page: division3Page,
})
