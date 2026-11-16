import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '#shell/AppLayout.tsx'
import { ModuleErrorBoundary } from '#shell/ModuleErrorBoundary.tsx'
import { PageSkeleton } from '#shell/PageSkeleton.tsx'
import { modules } from './modules.ts'

export function AppRoutes() {
  const first = [...modules].sort((a, b) => (a.nav.order ?? 0) - (b.nav.order ?? 0))[0]
  return (
    <Routes>
      <Route element={<AppLayout modules={modules} />}>
        {modules.map(({ id, basePath, Routes: ModuleRoutes }) => (
          <Route
            key={id}
            path={`${basePath}/*`}
            element={
              // Inside the layout: the nav stays usable while a chunk loads or a module crashes.
              <ModuleErrorBoundary key={id} moduleId={id}>
                <Suspense fallback={<PageSkeleton />}>
                  <ModuleRoutes />
                </Suspense>
              </ModuleErrorBoundary>
            }
          />
        ))}
        <Route path="*" element={first ? <Navigate to={first.basePath} replace /> : null} />
      </Route>
    </Routes>
  )
}
