import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { stageLabel, routeForStage } from '@/lib/constants'

// "Ordered 12 Sep 2026 · Due 30 Sep 2026" — shown under the order in
// cross-order views (stage queue History) where there's no order header.
function OrderDates({ entry }) {
  if (!entry.orderDate && !entry.targetDeliveryDate) return null
  return (
    <div className="text-xs text-hos-ink-400">
      Ordered {formatDate(entry.orderDate)} · Due {formatDate(entry.targetDeliveryDate)}
    </div>
  )
}

export default function HistoryTable({ entries = [], showStage = false, showOrder = false }) {
  if (!entries.length) {
    return <p className="py-6 text-center text-sm text-hos-ink-400">No history recorded yet.</p>
  }
  const sorted = [...entries].sort((a, b) => new Date(b.at) - new Date(a.at))

  return (
    <>
      {/* Desktop / tablet: real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-hos-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-hos-ink-500">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">Date &amp; Time</th>
              {showOrder && <th className="whitespace-nowrap px-3 py-2">Order</th>}
              {showStage && <th className="whitespace-nowrap px-3 py-2">Stage</th>}
              <th className="whitespace-nowrap px-3 py-2">User</th>
              <th className="whitespace-nowrap px-3 py-2">Action</th>
              <th className="whitespace-nowrap px-3 py-2">Status Change</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hos-ink-100 align-top">
            {sorted.map((h) => (
              <tr key={h.id}>
                <td className="whitespace-nowrap px-3 py-2.5 text-hos-ink-500">{formatDateTime(h.at)}</td>
                {showOrder && (
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {h.orderId ? (
                      <Link to={`/orders/${h.orderId}/${routeForStage(h.stage)}`} className="font-semibold text-hos-gold-700 hover:underline">
                        {h.orderNumber}
                      </Link>
                    ) : (
                      h.orderNumber
                    )}
                    {h.customerName && <div className="text-xs text-hos-ink-400">{h.customerName}</div>}
                    <OrderDates entry={h} />
                  </td>
                )}
                {showStage && <td className="whitespace-nowrap px-3 py-2.5">{stageLabel(h.stage)}</td>}
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-hos-ink-800">{h.user}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="rounded-full bg-hos-gold-50 px-2 py-0.5 text-xs font-semibold text-hos-gold-700">{h.action}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-hos-ink-600">
                  {h.prevStatus} → <span className="font-semibold text-hos-ink-900">{h.newStatus}</span>
                </td>
                <td className="px-3 py-2.5 text-hos-ink-600">
                  {h.fields?.length > 0 ? (
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {h.fields.map((f) => (
                        <span key={f.label} className="whitespace-nowrap rounded bg-hos-ink-50 px-1.5 py-0.5 text-xs">
                          <span className="font-medium text-hos-ink-800">{f.label}:</span> {f.value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="max-w-xs px-3 py-2.5 text-hos-ink-500">{h.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per history entry */}
      <div className="divide-y divide-hos-ink-100 md:hidden">
        {sorted.map((h) => (
          <div key={h.id} className="p-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-xs text-hos-ink-500">
                <History size={12} className="text-hos-ink-300" />
                {formatDateTime(h.at)}
              </span>
              {showOrder && h.orderId && (
                <Link to={`/orders/${h.orderId}/${routeForStage(h.stage)}`} className="rounded-full bg-hos-gold-100 px-2 py-0.5 text-xs font-semibold text-hos-gold-700">
                  {h.orderNumber}
                </Link>
              )}
            </div>
            {showOrder && h.customerName && <div className="mt-0.5 text-xs text-hos-ink-400">{h.customerName}</div>}
            {showOrder && <OrderDates entry={h} />}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-hos-ink-900">{h.user}</span>
              {showStage && <span className="rounded-full bg-hos-ink-100 px-2 py-0.5 text-xs font-medium text-hos-ink-600">{stageLabel(h.stage)}</span>}
              <span className="rounded-full bg-hos-gold-50 px-2 py-0.5 text-xs font-semibold text-hos-gold-700">{h.action}</span>
            </div>
            <div className="mt-1 text-xs text-hos-ink-600">
              {h.prevStatus} → <span className="font-semibold text-hos-ink-900">{h.newStatus}</span>
            </div>
            {h.remarks && <p className="mt-1.5 text-sm text-hos-ink-600">{h.remarks}</p>}
            {h.fields?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {h.fields.map((f) => (
                  <span key={f.label} className="rounded-md bg-hos-ink-50 px-2 py-1 text-xs text-hos-ink-600">
                    <span className="font-medium text-hos-ink-800">{f.label}:</span> {f.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
