import type { ComponentType } from 'react'

export interface NavItem {
  label: string
  path: string
}

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
  /** Renders the module's own <Routes>; heavy views are lazy inside it. */
  Routes: ComponentType
}
