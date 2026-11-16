import { DivisionRoutes } from '#shared/division-routes.tsx'
import { division2Page } from './config.ts'

/** Paths are relative to the module's basePath. */
export default function Division2Routes() {
  return <DivisionRoutes label="Division 2" page={division2Page} />
}
