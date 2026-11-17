import { lazy, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { AppModule, NavItem } from '../module-contract.ts'
import type { AnyPage } from '../search-page/index.tsx'
import { EmptyView } from './EmptyView.tsx'

/** What every view receives; a module's own view can ignore what it does not need. */
export interface ViewProps {
  label: string
  page: AnyPage
}
export type ViewComponent = ComponentType<ViewProps>

export interface ViewDef {
  /** Relative to the module's basePath. */
  path: string
  label: string
  Component: ViewComponent
}

// Heavy code (AG Grid) loads on first visit to the view, not with the shell.
const SearchView = lazy(async () => {
  const { SearchPage } = await import('../search-page/index.tsx')
  return { default: ({ page }: ViewProps) => <SearchPage page={page} /> }
})

/** The 80%: views every division has. A module changes one by key, or drops it with `false`. */
const defaultViews = {
  dashboard: { label: 'Dashboard', Component: ({ label }: ViewProps) => <EmptyView title={`Dashboard: ${label}`} /> },
  search: { label: 'Search', Component: SearchView },
  run: { label: 'Run', Component: ({ label }: ViewProps) => <EmptyView title={`Run: ${label}`} /> },
}
type DefaultViewKey = keyof typeof defaultViews

export interface DivisionOptions {
  id: string
  label: string
  order?: number
  page: AnyPage
  /** Per-view deviation by composition: swap a default view's component or remove it. */
  views?: Partial<Record<DefaultViewKey, ViewComponent | false>>
  /** Views only this division has; appended after the defaults. */
  extraViews?: ViewDef[]
}

/**
 * Builds the shell-facing AppModule from a page config. Nav, paths and routes are
 * derived from one view list, so they cannot drift apart.
 */
export function defineDivision({ id, label, order, page, views = {}, extraViews = [] }: DivisionOptions): AppModule {
  const list: ViewDef[] = [
    ...(Object.keys(defaultViews) as DefaultViewKey[]).flatMap((key) => {
      const override = views[key]
      if (override === false) return []
      return [{ path: key, label: defaultViews[key].label, Component: override ?? defaultViews[key].Component }]
    }),
    ...extraViews,
  ]
  const items: NavItem[] = list.map(({ path, label }) => ({ path, label }))
  const first = list[0]?.path

  /** Paths are relative to the module's basePath. */
  function DivisionRoutes() {
    return (
      <Routes>
        {first && <Route index element={<Navigate to={first} replace />} />}
        {list.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component label={label} page={page} />} />
        ))}
        {first && <Route path="*" element={<Navigate to={first} replace />} />}
      </Routes>
    )
  }

  return { id, basePath: `/${id}`, nav: { label, order, items }, Routes: DivisionRoutes }
}
