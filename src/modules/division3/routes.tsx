import { DivisionRoutes } from '#shared/division-routes.tsx'
import { division3Page } from './config.ts'

/** Paths are relative to the module's basePath. */
export default function Division3Routes() {
  return <DivisionRoutes label="Division 3" page={division3Page} />
}
