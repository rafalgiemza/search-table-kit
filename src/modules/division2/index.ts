import { defineDivision } from '#shared/division/define-division.tsx'
import { division2Page } from './config.ts'

export { division2Page } from './config.ts'

/** Public API of the module (the only entry allowed from outside, see lint). */
export const division2Module = defineDivision({
  id: 'division-2',
  label: 'Division 2',
  order: 2,
  page: division2Page,
})
