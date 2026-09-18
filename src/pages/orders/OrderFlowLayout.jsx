import { useEffect, useState } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { ArrowLeft, Scale, History as HistoryIcon } from 'lucide-react'
import { Orders, Employees, Masters } from '@/lib/db'
import Timeline from '@/components/common/Timeline'
import { StatusBadge, DelayBadge } from '@/components/common/Badge'
import { computeDelay, DELAY_STATE_META, formatDate, cx } from '@/lib/utils'
import { STAGES, routeForStage } from '@/lib/constants'

/**
 * Shell for the order "flow" — one dedicated page per production stage,
 * moved through one-by-one (Previous / Next), FMS-style. Loads the order
 * once, shows the header + stepper, and hands the active stage page
 * everything it needs via the router's Outlet context.
 */
export default function OrderFlowLayout() {
  const { id, stage } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [employees, setEmployees] = useState([])
  const [masters, setMasters] = useState({})

  const refresh = () => Orders.get(id).then((o) => o && setOrder(o))

  useEffect(() => {
    refresh()
    Employees.list().then(setEmployees)
    Masters.listAll().then(setMasters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!order) {
    return <div className="py-20 text-center text-hos-ink-400">Loading order…</div>
  }

  const overallDelay = computeDelay({
    targetDate: order.targetDeliveryDate,
    completionDate: order.stages.delivery?.completionDate,
    status: order.overallStatus,
    isTerminal: order.overallStatus === 'Delivered' || order.overallStatus === 'Closed',
  })

  const isUtilityPage = stage === 'reconciliation' || stage === 'history'

  return (
    <div>
      <button onClick={() => navigate('/orders')} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-hos-ink-500 hover:text-hos-ink-800">
        <ArrowLeft size={15} /> Back to Orders
      </button>

      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-hos-ink-900">{order.orderNumber}</h1>
              <StatusBadge status={order.overallStatus} />
              <DelayBadge state={overallDelay.state} days={overallDelay.delayDays} label={DELAY_STATE_META[overallDelay.state]?.label} />
            </div>
            <p className="mt-1 text-sm text-hos-ink-500">
              {order.customerName} · {order.productName} ({order.productCode}) · Qty {order.quantity}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs uppercase text-hos-ink-400">Priority</div>
              <StatusBadge status={order.priority} />
            </div>
            <div>
              <div className="text-xs uppercase text-hos-ink-400">Target Delivery</div>
              <div className="font-semibold text-hos-ink-800">{formatDate(order.targetDeliveryDate)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-hos-ink-400">Current Stage</div>
              <div className="font-semibold text-hos-ink-800">{STAGES.find((s) => s.key === order.currentStage)?.label}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-hos-ink-400">Sales Person</div>
              <div className="font-semibold text-hos-ink-800">{order.salesPerson}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <Timeline order={order} activeStage={isUtilityPage ? null : STAGES.find((s) => s.route === stage)?.key} onSelect={(key) => navigate(`/orders/${id}/${routeForStage(key)}`)} />
      </div>

      <div className="mb-5 flex gap-2">
        <UtilityLink active={stage === 'reconciliation'} onClick={() => navigate(`/orders/${id}/reconciliation`)} icon={Scale} label="Material Reconciliation" />
        <UtilityLink active={stage === 'history'} onClick={() => navigate(`/orders/${id}/history`)} icon={HistoryIcon} label="Full History" />
      </div>

      <div className="card p-5">
        <Outlet context={{ order, employees, masters, refresh }} />
      </div>
    </div>
  )
}

function UtilityLink({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'border-hos-gold-400 bg-hos-gold-50 text-hos-gold-700' : 'border-hos-ink-200 text-hos-ink-500 hover:bg-hos-ink-100'
      )}
    >
      <Icon size={13} /> {label}
    </button>
  )
}
