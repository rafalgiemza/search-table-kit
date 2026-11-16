import { Route, Routes } from 'react-router-dom'
import { SearchPage } from '#shared/search-page/index.tsx'
import { division2Page } from './config.ts'

/** Paths are relative to the module's basePath. */
export default function Division2Routes() {
  return (
    <Routes>
      <Route index element={<SearchPage page={division2Page} />} />
    </Routes>
  )
}
