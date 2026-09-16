import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, LogOut, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { Orders } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import { cx } from '@/lib/utils'

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { items, unreadCount, markAllRead, markRead } = useNotifications()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [showBell, setShowBell] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const bellRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false)
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false)
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    Orders.list().then((orders) => {
      const q = query.toLowerCase()
      const matches = orders.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.productName?.toLowerCase().includes(q) ||
          o.productCode?.toLowerCase().includes(q) ||
          o.salesPerson?.toLowerCase().includes(q)
      )
      setResults(matches.slice(0, 8))
    })
  }, [query])

  return (
    <header className="flex h-16 items-center gap-2 border-b border-hos-ink-200 bg-white px-3 sm:gap-4 sm:px-6">
      <button className="shrink-0 rounded-lg p-2 text-hos-ink-500 hover:bg-hos-ink-100 lg:hidden" onClick={onMenuClick}>
        <Menu size={20} />
      </button>

      <div ref={searchRef} className="relative min-w-0 flex-1 sm:max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hos-ink-400" />
        <input
          className="input pl-9"
          placeholder="Search orders, customers, articles…"
          value={query}
          onFocus={() => setShowResults(true)}
          onChange={(e) => setQuery(e.target.value)}
        />
        {showResults && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-hos-ink-200 bg-white shadow-lg">
            {results.map((o) => (
              <button
                key={o.id}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-hos-gold-50"
                onClick={() => {
                  navigate(`/orders/${o.id}`)
                  setShowResults(false)
                  setQuery('')
                }}
              >
                <span>
                  <span className="font-semibold text-hos-ink-900">{o.orderNumber}</span>
                  <span className="ml-2 text-hos-ink-500">{o.customerName} · {o.productName}</span>
                </span>
                <span className="text-xs text-hos-ink-400">{o.overallStatus}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
        <div ref={bellRef} className="relative">
          <button
            className="relative rounded-lg p-2 text-hos-ink-500 hover:bg-hos-ink-100"
            onClick={() => setShowBell((s) => !s)}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showBell && (
            <div className="fixed inset-x-3 top-16 z-30 mt-0 rounded-lg border border-hos-ink-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
              <div className="flex items-center justify-between border-b border-hos-ink-100 px-4 py-2.5">
                <span className="text-sm font-semibold">Notifications</span>
                <button className="text-xs font-medium text-hos-gold-600 hover:underline" onClick={markAllRead}>
                  Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-hos-ink-400">No notifications yet.</p>}
                {items.slice(0, 15).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead(n.id)
                      if (n.orderId) navigate(`/orders/${n.orderId}`)
                      setShowBell(false)
                    }}
                    className={cx('block w-full border-b border-hos-ink-50 px-4 py-2.5 text-left text-xs hover:bg-hos-gold-50', !n.read && 'bg-hos-gold-50/50')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-hos-ink-800">{n.type}</span>
                      <span className="text-hos-ink-400">{formatDateTime(n.at)}</span>
                    </div>
                    <p className="mt-0.5 text-hos-ink-600">{n.message}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={userRef} className="relative">
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hos-ink-100" onClick={() => setShowUser((s) => !s)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-hos-gold-100 text-sm font-bold text-hos-gold-700">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="hidden text-left text-xs sm:block">
              <div className="font-semibold text-hos-ink-800">{user?.name}</div>
              <div className="capitalize text-hos-ink-400">{user?.role?.replace(/_/g, ' ')}</div>
            </div>
            <ChevronDown size={14} className="hidden text-hos-ink-400 sm:block" />
          </button>
          {showUser && (
            <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-lg border border-hos-ink-200 bg-white py-1 shadow-lg">
              <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-hos-ink-700 hover:bg-hos-ink-50">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
