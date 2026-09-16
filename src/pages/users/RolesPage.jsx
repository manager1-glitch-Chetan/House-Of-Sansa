import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Permissions } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { ROLES, MODULES, STAGES, DEFAULT_ROLE_PERMISSIONS } from '@/lib/constants'
import { getRolePermissions } from '@/lib/permissions'
import PageHeader from '@/components/common/PageHeader'
import { cx } from '@/lib/utils'

const MODULE_LABELS = {
  [MODULES.DASHBOARD]: 'Dashboard',
  [MODULES.ORDERS]: 'Orders',
  [MODULES.MASTERS]: 'Masters',
  [MODULES.USERS]: 'Users & Roles',
  [MODULES.NOTIFICATIONS]: 'Notifications',
}

export default function RolesPage() {
  const { refreshOverrides } = useAuth()
  const [overrides, setOverrides] = useState(null)
  const [activeRole, setActiveRole] = useState('sales')
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Permissions.get().then((p) => {
      setOverrides(p)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  const current = getRolePermissions(activeRole, overrides)

  const toggleModule = (mod) => {
    const perms = getRolePermissions(activeRole, overrides)
    const modules = perms.modules.includes(mod) ? perms.modules.filter((m) => m !== mod) : [...perms.modules, mod]
    setOverrides((o) => ({ ...(o || {}), [activeRole]: { ...perms, modules } }))
  }
  const toggleStage = (stageKey) => {
    const perms = getRolePermissions(activeRole, overrides)
    const stages = perms.stages.includes(stageKey) ? perms.stages.filter((s) => s !== stageKey) : [...perms.stages, stageKey]
    setOverrides((o) => ({ ...(o || {}), [activeRole]: { ...perms, stages } }))
  }

  const save = async () => {
    await Permissions.set(overrides)
    await refreshOverrides()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const resetToDefault = () => {
    setOverrides((o) => {
      const next = { ...(o || {}) }
      delete next[activeRole]
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="Role Permissions"
        subtitle="Control which modules and production stages each role can access."
        actions={
          <>
            <Link to="/users" className="btn-outline">
              <ArrowLeft size={15} /> Back to Users
            </Link>
            <button className="btn-gold" onClick={save}>
              <Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="flex flex-wrap gap-1.5 lg:w-56 lg:shrink-0 lg:flex-col lg:flex-nowrap lg:gap-0 lg:space-y-0.5">
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveRole(r.key)}
              className={cx(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors lg:block lg:w-full lg:rounded-lg lg:px-3 lg:py-2 lg:text-left lg:text-sm',
                activeRole === r.key
                  ? 'bg-hos-gold-500 text-white'
                  : 'bg-hos-ink-100 text-hos-ink-600 hover:bg-hos-ink-200 lg:bg-transparent lg:hover:bg-hos-ink-100'
              )}
            >
              {r.label}
            </button>
          ))}
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          {activeRole === 'admin' ? (
            <div className="card p-5 text-sm text-hos-ink-500">Admin always has full access to every module and stage. This cannot be restricted.</div>
          ) : (
            <>
              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-hos-ink-800">Modules</h3>
                  <button className="text-xs font-medium text-hos-gold-600 hover:underline" onClick={resetToDefault}>
                    Reset to default
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.values(MODULES).map((m) => (
                    <label key={m} className="flex items-center gap-2 rounded-lg border border-hos-ink-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={current.modules.includes(m)} onChange={() => toggleModule(m)} className="h-4 w-4 rounded accent-hos-gold-500" />
                      {MODULE_LABELS[m]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="mb-3 font-display text-base font-semibold text-hos-ink-800">Production Stages</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {STAGES.map((s) => (
                    <label key={s.key} className="flex items-center gap-2 rounded-lg border border-hos-ink-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={current.stages.includes(s.key)} onChange={() => toggleStage(s.key)} className="h-4 w-4 rounded accent-hos-gold-500" />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs text-hos-ink-400">
                Default for {activeRole}: {DEFAULT_ROLE_PERMISSIONS[activeRole]?.stages.join(', ') || 'none'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
