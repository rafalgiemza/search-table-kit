import { Route, Routes } from 'react-router-dom'
import { SearchPage } from '#shared/search-page/index.tsx'
import { division3Page } from './config.ts'

/** Paths are relative to the module's basePath. */
export default function Division3Routes() {
  return (
    <Routes>
      <Route index element={<SearchPage page={division3Page} />} />
    </Routes>
  )
}
