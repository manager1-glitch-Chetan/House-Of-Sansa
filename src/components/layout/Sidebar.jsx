import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PackageSearch,
  PlusCircle,
  Boxes,
  Users,
  Bell,
  Gem,
  Diamond,
  ClipboardList,
  Hammer,
  PenTool,
  Cpu,
  Flame,
  Droplet,
  Sparkles,
  ShieldCheck,
  Package,
  Truck,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { MODULES, routeForStage } from '@/lib/constants'
import { Orders, dbEvents } from '@/lib/db'
import { computeStageCounts } from '@/lib/analytics'
import { cx } from '@/lib/utils'

const TOP_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: MODULES.DASHBOARD },
  { to: '/orders/new', label: 'New Order', icon: PlusCircle, module: MODULES.ORDERS },
  { to: '/orders', label: 'All Orders', icon: PackageSearch, module: MODULES.ORDERS },
]

// One sidebar item per production stage — this is the "work queue" for that
// department: clicking it shows every order currently sitting there.
const STAGE_NAV = [
  { key: 'planning', label: 'Order Planning', icon: ClipboardList },
  { key: 'karigarAssign', label: 'Karigar Assign', icon: Hammer },
  { key: 'cad', label: 'CAD', icon: PenTool },
  { key: 'camRpt', label: 'CAM / RPT', icon: Cpu },
  { key: 'gemStone', label: 'Gem Stone', icon: Diamond },
  { key: 'casting', label: 'Casting', icon: Flame },
  { key: 'filling', label: 'Filling', icon: Droplet },
  { key: 'diamondSetting', label: 'Diamond Setting', icon: Gem },
  { key: 'rhodium', label: 'Rhodium', icon: Sparkles },
  { key: 'finalQc', label: 'Final QC', icon: ShieldCheck },
  { key: 'packing', label: 'Packing', icon: Package },
  { key: 'delivery', label: 'Delivery', icon: Truck },
]

const BOTTOM_NAV = [
  { to: '/masters', label: 'Masters', icon: Boxes, module: MODULES.MASTERS },
  { to: '/users', label: 'Users & Roles', icon: Users, module: MODULES.USERS },
  { to: '/notifications', label: 'Notifications', icon: Bell, module: MODULES.NOTIFICATIONS },
]

function itemClass({ isActive }) {
  return cx(
    'flex items-center gap-2.5 rounded-lg border-l-4 px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'border-hos-gold-500 bg-hos-gold-50 text-hos-gold-700'
      : 'border-transparent text-hos-ink-600 hover:bg-hos-ink-50 hover:text-hos-ink-900'
  )
}

function CountBadge({ count }) {
  if (!count) return null
  return <span className="ml-auto rounded-full bg-hos-gold-100 px-2 py-0.5 text-[11px] font-bold text-hos-gold-700">{count}</span>
}

// `open` / `onClose` only matter below the lg breakpoint — on desktop the
// sidebar is always visible, in-flow. On mobile it's a fixed off-canvas
// drawer with a backdrop, toggled from the Topbar's hamburger button.
export default function Sidebar({ open = false, onClose }) {
  const { hasModule, hasStage, user, logout } = useAuth()
  const [counts, setCounts] = useState({})

  useEffect(() => {
    const load = () => Orders.list().then((orders) => setCounts(computeStageCounts(orders)))
    load()
    dbEvents.addEventListener('change', load)
    return () => dbEvents.removeEventListener('change', load)
  }, [])

  const navClass = ({ isActive }) => itemClass({ isActive })
  const closeOnNavigate = () => onClose?.()

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-hos-ink-950/50 lg:hidden" onClick={onClose} />}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] shrink-0 flex-col border-r border-hos-ink-200 bg-white transition-transform duration-200 ease-out',
          'lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-2 border-b border-hos-ink-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hos-gold-500 text-white">
            <Gem size={18} />
          </div>
          <div className="flex-1">
            <div className="font-display text-base font-bold leading-tight text-hos-gold-600">House of Sansa</div>
            <div className="text-[10px] uppercase tracking-wide text-hos-ink-400">Raipur · Chhattisgarh</div>
          </div>
          <button className="rounded-lg p-1.5 text-hos-ink-400 hover:bg-hos-ink-100 lg:hidden" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {TOP_NAV.filter((n) => hasModule(n.module)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/orders'} className={navClass} onClick={closeOnNavigate}>
              <n.icon size={17} />
              {n.label}
            </NavLink>
          ))}

          <div className="my-2 border-t border-hos-ink-100 pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-hos-ink-400">Production Flow</div>
            {STAGE_NAV.filter((s) => hasStage(s.key) || hasStage('*')).map((s) => (
              <NavLink key={s.key} to={`/stage/${routeForStage(s.key)}`} className={navClass} onClick={closeOnNavigate}>
                <s.icon size={17} />
                <span className="truncate">{s.label}</span>
                <CountBadge count={counts[s.key]} />
              </NavLink>
            ))}
          </div>

          {BOTTOM_NAV.some((n) => hasModule(n.module)) && (
            <div className="my-2 border-t border-hos-ink-100 pt-2">
              {BOTTOM_NAV.filter((n) => hasModule(n.module)).map((n) => (
                <NavLink key={n.to} to={n.to} className={navClass} onClick={closeOnNavigate}>
                  <n.icon size={17} />
                  {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-hos-ink-100 px-4 py-3">
          <div className="mb-2 text-xs">
            <div className="font-semibold text-hos-ink-800">{user?.name}</div>
            <div className="capitalize text-hos-ink-400">{user?.role?.replace(/_/g, ' ')}</div>
          </div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
