import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

// App-wide safety net. Without this, any uncaught error thrown during render
// (a bad prop, an unexpected data shape, etc.) unmounts the entire React
// tree and the app just goes blank/black with nothing on screen. This catches
// that and shows a recoverable message instead. It's defense-in-depth only —
// it doesn't fix the underlying bug, it just stops "black screen, no idea
// what happened" from ever being the user's only feedback.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-hos-ink-50 px-4">
          <div className="card max-w-md p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h1 className="font-display text-lg font-bold text-hos-ink-900">Something went wrong</h1>
            <p className="mt-1.5 text-sm text-hos-ink-500">
              An unexpected error occurred and this page couldn't be displayed. Reloading usually fixes it.
            </p>
            <button className="btn-gold mt-4" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
