import { lazy } from 'react'
import { divisionNavItems, type AppModule } from '#shared/module-contract.ts'

export { division1Page } from './config.ts'

/**
 * Public API of the module; nothing else may be imported from outside (lint).
 * Keep it light: it loads with the shell, the table code is in the lazy chunk.
 */
export const division1Module: AppModule = {
  id: 'division-1',
  basePath: '/division-1',
  nav: { label: 'Division 1', order: 1, items: divisionNavItems },
  Routes: lazy(() => import('./routes.tsx')),
}
