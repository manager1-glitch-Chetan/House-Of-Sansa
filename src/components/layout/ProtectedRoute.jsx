import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function RequireModule({ module, children }) {
  const { hasModule } = useAuth()
  if (!hasModule(module)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <p className="font-display text-xl font-bold text-hos-ink-800">Access Restricted</p>
        <p className="mt-1 text-sm text-hos-ink-500">You don't have permission to view this module. Contact your Admin.</p>
      </div>
    )
  }
  return children
}
