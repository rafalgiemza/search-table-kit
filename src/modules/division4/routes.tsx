import { Navigate, Route, Routes } from 'react-router-dom'
import { Dashboard } from './Dashboard.tsx'

/** Paths are relative to the module's basePath. Dashboard only, for now. */
export default function Division4Routes() {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
