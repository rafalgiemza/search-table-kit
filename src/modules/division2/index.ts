import { lazy } from 'react'
import type { AppModule } from '#shared/module-contract.ts'

export { division2Page } from './config.ts'

/**
 * Public API of the module; nothing else may be imported from outside (lint).
 * Keep it light: it loads with the shell, the table code is in the lazy chunk.
 */
export const division2Module: AppModule = {
  id: 'division-2',
  basePath: '/division-2',
  nav: { label: 'Division 2', order: 2 },
  Routes: lazy(() => import('./routes.tsx')),
}
