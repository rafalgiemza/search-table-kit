import { lazy } from 'react'
import { divisionNavItems, type AppModule } from '#shared/module-contract.ts'

export { division3Page } from './config.ts'

/**
 * Public API of the module; nothing else may be imported from outside (lint).
 * Keep it light: it loads with the shell, the table code is in the lazy chunk.
 */
export const division3Module: AppModule = {
  id: 'division-3',
  basePath: '/division-3',
  nav: { label: 'Division 3', order: 3, items: divisionNavItems },
  Routes: lazy(() => import('./routes.tsx')),
}
