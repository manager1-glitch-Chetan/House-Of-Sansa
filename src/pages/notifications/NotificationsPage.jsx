import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/common/Badge'
import { formatDateTime, cx } from '@/lib/utils'

const SEVERITY_TONE = { info: 'info', success: 'success', warning: 'warning', danger: 'danger' }

export default function NotificationsPage() {
  const { items, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${items.filter((n) => !n.read).length} unread of ${items.length} total`}
        actions={
          <button className="btn-outline" onClick={markAllRead}>
            <CheckCheck size={15} /> Mark all read
          </button>
        }
      />
      <div className="card divide-y divide-hos-ink-100">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-hos-ink-400">
            <Bell size={28} className="mb-2" />
            No notifications yet.
          </div>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              markRead(n.id)
              if (n.orderId) navigate(`/orders/${n.orderId}`)
            }}
            className={cx('flex w-full items-start justify-between gap-4 px-5 py-3.5 text-left hover:bg-hos-gold-50/60', !n.read && 'bg-hos-gold-50/40')}
          >
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={SEVERITY_TONE[n.severity] || 'neutral'}>{n.type}</Badge>
                {n.orderNumber && <span className="text-xs font-semibold text-hos-ink-500">{n.orderNumber}</span>}
                {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-hos-gold-500" />}
              </div>
              <p className="mt-1 text-sm text-hos-ink-700">{n.message}</p>
            </div>
            <span className="shrink-0 text-xs text-hos-ink-400">{formatDateTime(n.at)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
