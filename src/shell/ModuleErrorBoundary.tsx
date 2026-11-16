import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  moduleId: string
  children: ReactNode
}

/**
 * Isolates a module: a crash (or a failed chunk load) leaves the shell usable.
 * Render with key={moduleId} so switching modules clears the error.
 */
export class ModuleErrorBoundary extends Component<Props, { error: unknown }> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(`[module:${this.props.moduleId}]`, error, info.componentStack)
  }

  render() {
    if (this.state.error === null) return this.props.children
    const message = this.state.error instanceof Error ? this.state.error.message : 'Something went wrong.'
    return (
      <div role="alert" style={{ padding: 16 }}>
        <p>{message}</p>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    )
  }
}
