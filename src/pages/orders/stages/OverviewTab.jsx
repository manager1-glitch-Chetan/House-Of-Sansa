import { formatDate, num } from '@/lib/utils'
import FileUpload from '@/components/common/FileUpload'
import { StatusBadge } from '@/components/common/Badge'

function Row({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-hos-ink-400">{label}</div>
      <div className="text-sm text-hos-ink-800">{value || '—'}</div>
    </div>
  )
}

export default function OverviewTab({ order }) {
  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Order Received</h4>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Row label="Order Date" value={formatDate(order.orderDate)} />
          <Row label="Customer" value={order.customerName} />
          <Row label="Design / Item" value={order.productName} />
          <Row label="Pcs" value={order.quantity} />
          <Row label="Size" value={order.size} />
          <Row label="Target Date" value={formatDate(order.targetDeliveryDate)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">{order.gold?.type || 'Metal'}</h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Row label="Type" value={order.gold?.type} />
            <Row label="Purity" value={order.gold?.purity} />
            <Row label="Colour" value={order.gold?.colour} />
            <Row label="Weight (g)" value={num(order.gold?.estimatedWeight)} />
          </div>
        </div>
        <div className="card p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond</h4>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Diamond Pcs" value={order.diamond?.pcs} />
            <Row label="Diamond Weight (ct)" value={num(order.diamond?.weight)} />
            <Row label="Diamond Particular" value={order.diamond?.particular} />
          </div>
        </div>
      </div>

      <div>
        <FileUpload label="Reference Image" value={order.referenceImage || []} disabled />
      </div>

      <details className="card p-4 text-sm text-hos-ink-600 [&_summary]:cursor-pointer">
        <summary className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Additional Office Details</summary>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Row label="Customer Contact" value={order.customerContact} />
          <Row label="Sales Person" value={order.salesPerson} />
          <Row label="Order Type" value={order.orderType} />
          <Row label="Priority" value={<StatusBadge status={order.priority} />} />
          <Row label="Product Code" value={order.productCode} />
          <Row label="Customer Reference #" value={order.customerRefNumber} />
        </div>
        <div className="mt-4">
          <Row label="Customer Requirement" value={order.customerRequirement} />
        </div>
      </details>
    </div>
  )
}
