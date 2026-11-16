import type { ComponentType, LazyExoticComponent } from 'react'

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
  }
  /** Lazy component rendering the module's own <Routes>. One chunk per module. */
  Routes: LazyExoticComponent<ComponentType>
}
