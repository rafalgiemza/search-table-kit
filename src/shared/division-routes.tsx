import { Navigate, Route, Routes } from 'react-router-dom'
import styled from 'styled-components'
import { SearchPage } from './search-page/index.tsx'

const Empty = styled.div`
  padding: 24px;
  color: var(--muted);
`

function EmptyView({ title }: { title: string }) {
  return (
    <Empty>
      <h2>{title}</h2>
    </Empty>
  )
}

/** The three views every division has; keep paths in sync with `divisionNavItems`. */
export function DivisionRoutes({ page, label }: { label: string; page: React.ComponentProps<typeof SearchPage>['page'] }) {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<EmptyView title={`Dashboard: ${label}`} />} />
      <Route path="search" element={<SearchPage page={page} />} />
      <Route path="run" element={<EmptyView title={`Run: ${label}`} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
