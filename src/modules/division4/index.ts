import { lazy } from 'react'
import type { AppModule } from '#shared/module-contract.ts'

/** Public API of the module; nothing else may be imported from outside (lint). */
export const division4Module: AppModule = {
  id: 'division-4',
  basePath: '/division-4',
  nav: { label: 'Division 4', order: 4, items: [{ label: 'Dashboard', path: 'dashboard' }] },
  Routes: lazy(() => import('./routes.tsx')),
}
