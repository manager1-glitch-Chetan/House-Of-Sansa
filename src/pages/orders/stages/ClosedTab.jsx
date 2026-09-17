import { CheckCircle2, Clock } from 'lucide-react'
import HistoryTable from '@/components/common/HistoryTable'
import { formatDate } from '@/lib/utils'

// Read-only — there's no manual action here anymore. The order completes
// itself automatically the instant Delivery is marked Delivered (see
// applyOrderClosure/updateStage in db.js), so this page only ever reports
// that outcome; it never asks anyone to do something to reach it.
export default function ClosedTab({ order }) {
  const isComplete = order.stages.closed.status === 'Completed'

  if (isComplete) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-lg bg-hos-ink-900 px-4 py-3 text-white">
          <CheckCircle2 size={18} className="text-hos-gold-400" />
          Completed on {formatDate(order.closedDate)}
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Completion History</h4>
          <div className="card">
            <HistoryTable entries={order.stages.closed.history} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-hos-ink-50 px-4 py-3 text-sm text-hos-ink-500">
      <Clock size={16} />
      This order will be marked Complete automatically once Delivery is finished — nothing to do here yet.
    </div>
  )
}
