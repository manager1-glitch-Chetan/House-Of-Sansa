import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Orders } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { Field, TextArea } from '@/components/common/Field'
import HistoryTable from '@/components/common/HistoryTable'
import { formatDate } from '@/lib/utils'

function Requirement({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-hos-ink-50 text-hos-ink-500'}`}>
      {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {label}
    </div>
  )
}

export default function ClosedTab({ order, onChanged }) {
  const { user } = useAuth()
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const qcOk = order.stages.finalQc.status === 'Approved'
  const packOk = order.stages.packing.status === 'Packed'
  const deliveryOk = order.stages.delivery.status === 'Delivered'
  const canClose = qcOk && packOk && deliveryOk
  const isClosed = order.stages.closed.status === 'Completed'

  const closeOrder = async () => {
    setSaving(true)
    try {
      const res = await Orders.closeOrder(order.id, { remarks }, user)
      if (res?.error) alert(res.error)
      else onChanged?.(res)
    } finally {
      setSaving(false)
    }
  }

  if (isClosed) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-lg bg-hos-ink-900 px-4 py-3 text-white">
          <CheckCircle2 size={18} className="text-hos-gold-400" />
          Order Closed on {formatDate(order.closedDate)} by {order.closedBy}
        </div>
        <p className="text-sm text-hos-ink-600">{order.stages.closed.remarks || 'No final remarks recorded.'}</p>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Closure History</h4>
          <div className="card">
            <HistoryTable entries={order.stages.closed.history} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-hos-ink-600">
        An order can only be closed once Final QC is Approved, Packing is Packed, and Delivery is Delivered.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Requirement ok={qcOk} label="Final QC Approved" />
        <Requirement ok={packOk} label="Packing Completed" />
        <Requirement ok={deliveryOk} label="Delivery Completed" />
      </div>
      <Field label="Final Remarks">
        <TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Closing notes for this order…" />
      </Field>
      <button className="btn-gold" disabled={!canClose || saving} onClick={closeOrder}>
        {saving ? 'Closing…' : 'Close Order'}
      </button>
    </div>
  )
}
