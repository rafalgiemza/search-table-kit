import type { ComponentType, LazyExoticComponent } from 'react'

export interface NavItem {
  label: string
  path: string
}

/** Every division has the same three views. */
export const divisionNavItems: NavItem[] = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Search', path: 'search' },
  { label: 'Run', path: 'run' },
]

/**
 * Contract between the shell and a feature module.
 * The shell knows only this interface, never module internals.
 */
export interface AppModule {
  /** Unique, stable identifier (keys, error reporting). */
  id: string
  /** Absolute base path, e.g. "/division-1". The module owns everything below it. */
  basePath: string
  nav: {
    label: string
    /** Lower numbers render first. */
    order?: number
    /** Sub-pages shown under the label; `path` is relative to basePath. */
    items: NavItem[]
  }
  /** Lazy component rendering the module's own <Routes>. One chunk per module. */
  Routes: LazyExoticComponent<ComponentType>
}
