import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { Users, Permissions } from '@/lib/db'
import { CURRENT_USER_KEY } from '@/lib/constants'
import { canAccessModule, canAccessStage, canOverrideWorkflow } from '@/lib/permissions'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [roleOverrides, setRoleOverrides] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Permissions.get().then(setRoleOverrides)
  }, [])

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const found = await Users.findByUsername(username)
      if (!found || found.password !== password) {
        return { error: 'Invalid username or password.' }
      }
      if (!found.active) {
        return { error: 'This account has been deactivated. Contact your Admin.' }
      }
      const session = { id: found.id, name: found.name, username: found.username, role: found.role, department: found.department }
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session))
      setUser(session)
      return { user: session }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(CURRENT_USER_KEY)
    setUser(null)
  }, [])

  const refreshOverrides = useCallback(async () => {
    const p = await Permissions.get()
    setRoleOverrides(p)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshOverrides,
      hasModule: (m) => canAccessModule(user, m, roleOverrides),
      hasStage: (s) => canAccessStage(user, s, roleOverrides),
      canOverride: canOverrideWorkflow(user),
    }),
    [user, loading, login, logout, refreshOverrides, roleOverrides]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
