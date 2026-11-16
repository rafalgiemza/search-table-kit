import { DivisionRoutes } from '#shared/division-routes.tsx'
import { division1Page } from './config.ts'

/** Paths are relative to the module's basePath. */
export default function Division1Routes() {
  return <DivisionRoutes label="Division 1" page={division1Page} />
}
