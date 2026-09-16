import { DEFAULT_ROLE_PERMISSIONS } from './constants'

export function getRolePermissions(role, overrides) {
  const base = DEFAULT_ROLE_PERMISSIONS[role] || { modules: [], stages: [] }
  const custom = overrides?.[role]
  if (!custom) return base
  return { modules: custom.modules ?? base.modules, stages: custom.stages ?? base.stages }
}

export function canAccessModule(user, moduleKey, overrides) {
  if (!user) return false
  if (user.role === 'admin') return true
  const perms = getRolePermissions(user.role, overrides)
  return perms.modules.includes(moduleKey)
}

export function canAccessStage(user, stageKey, overrides) {
  if (!user) return false
  if (user.role === 'admin') return true
  const perms = getRolePermissions(user.role, overrides)
  return perms.stages.includes('*') || perms.stages.includes(stageKey)
}

export function canOverrideWorkflow(user) {
  return user?.role === 'admin' || user?.role === 'management'
}
