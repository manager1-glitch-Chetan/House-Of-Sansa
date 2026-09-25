import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { PlayCircle, ExternalLink } from 'lucide-react'
import { Orders, Employees, Masters, dbEvents } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { STAGES, stageForRoute, routeForStage } from '@/lib/constants'
import { stageDelayFor, delayText, orderDateFields, ORDER_DATE_COLUMNS, DELAY_STATE_META, formatDate, num, cx } from '@/lib/utils'
import PageHeader from '@/components/common/PageHeader'
import DataTable from '@/components/common/DataTable'
import FilterBar from '@/components/common/FilterBar'
import Modal from '@/components/common/Modal'
import HistoryTable from '@/components/common/HistoryTable'
import { ReferenceImagesButton, ReferenceImagesModal } from '@/components/common/ReferenceImages'
import { StatusBadge, DelayBadge } from '@/components/common/Badge'
import { STAGE_COMPONENTS } from '@/pages/orders/stageComponents'

// Display value for an optional New Order field — blank shows as "—".
const orDash = (v) => (v === '' || v == null ? '—' : v)
// Weights/counts entered as 0 mean "not specified" on the New Order form.
const numOrDash = (v) => (Number(v) > 0 ? num(v) : '—')

function TabPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        active ? 'bg-hos-gold-500 text-white shadow-sm' : 'border border-hos-ink-200 bg-white text-hos-ink-600 hover:bg-hos-ink-50'
      )}
    >
      {children}
    </button>
  )
}

/**
 * The "work queue" for one production stage — every order currently sitting
 * there, across all customers, with a Pending / History split (matching the
 * factory-floor pattern where staff work the Pending queue and can look up
 * History for anything already processed at this stage).
 *
 * Pending: first column is always an Action button — click it to open that
 * order's stage form right here in a modal, without leaving the queue.
 * History: every past action recorded at this stage, across all orders,
 * newest first, with the actual field values that were filled in.
 */
export default function StageQueuePage() {
  const { stageKey: stageRoute } = useParams()
  const navigate = useNavigate()
  const { hasStage } = useAuth()
  const [orders, setOrders] = useState([])
  const [employees, setEmployees] = useState([])
  const [masters, setMasters] = useState({})
  const [filters, setFilters] = useState({})
  const [activeOrderId, setActiveOrderId] = useState(null)
  const [viewingImages, setViewingImages] = useState(null)
  const [tab, setTab] = useState('pending')

  const stageKey = stageForRoute(stageRoute)
  const stageMeta = STAGES.find((s) => s.key === stageKey)

  useEffect(() => {
    const load = () => Orders.list().then(setOrders)
    load()
    dbEvents.addEventListener('change', load)
    return () => dbEvents.removeEventListener('change', load)
  }, [])

  useEffect(() => {
    Employees.list().then(setEmployees)
    Masters.listAll().then(setMasters)
  }, [])

  const queue = useMemo(() => orders.filter((o) => o.currentStage === stageKey), [orders, stageKey])

  const historyEntries = useMemo(
    () =>
      orders.flatMap((o) =>
        (o.stages[stageKey]?.history || []).map((h) => ({
          ...h,
          orderId: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          orderDate: o.orderDate,
          targetDeliveryDate: o.targetDeliveryDate,
        }))
      ),
    [orders, stageKey]
  )

  const filtered = useMemo(() => {
    return queue.filter((o) => {
      if (filters.priority && o.priority !== filters.priority) return false
      if (filters.assignedPerson && o.stages[stageKey]?.assignedPerson !== filters.assignedPerson) return false
      if (filters.status && o.stages[stageKey]?.status !== filters.status) return false
      return true
    })
  }, [queue, filters, stageKey])

  // 'closed' has no actionable work queue — orders land there once and stay.
  if (!stageMeta || stageKey === 'closed') return <Navigate to="/dashboard" replace />
  if (!hasStage(stageKey) && !hasStage('*')) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <p className="font-display text-xl font-bold text-hos-ink-800">Access Restricted</p>
        <p className="mt-1 text-sm text-hos-ink-500">You don't have permission to view this stage's queue.</p>
      </div>
    )
  }

  const activeOrder = activeOrderId ? orders.find((o) => o.id === activeOrderId) : null
  const StageComponent = STAGE_COMPONENTS[stageKey]

  const assignedPersons = [...new Set(queue.map((o) => o.stages?.[stageKey]?.assignedPerson).filter(Boolean))]
  const statuses = [...new Set(queue.map((o) => o.stages?.[stageKey]?.status).filter(Boolean))]

  const rows = filtered.map((o) => {
    const rec = o.stages?.[stageKey] || {}
    const delayInfo = stageDelayFor(o, stageKey)
    return {
      ...o,
      ...orderDateFields(o),
      stageStatus: rec.status,
      assignedPerson: rec.assignedPerson || '—',
      stageTargetDate: rec.targetDate || '',
      stageTargetFmt: formatDate(rec.targetDate),
      delayInfo,
      delay: delayText(delayInfo),
      // Everything else filled in on the New Order form.
      salesPerson: orDash(o.salesPerson),
      orderType: orDash(o.orderType),
      customerContact: orDash(o.customerContact),
      customerRefNumber: orDash(o.customerRefNumber),
      customerRequirement: orDash(o.customerRequirement),
      productCode: orDash(o.productCode),
      size: orDash(o.size),
      images: o.referenceImage?.length ? `${o.referenceImage.length} image${o.referenceImage.length > 1 ? 's' : ''}` : '—',
      metalType: orDash(o.gold?.type),
      metalPurity: orDash(o.gold?.purity),
      metalColour: orDash(o.gold?.colour),
      metalWeight: numOrDash(o.gold?.estimatedWeight),
      metalWeightValue: Number(o.gold?.estimatedWeight) || '',
      diamondPcs: numOrDash(o.diamond?.pcs),
      diamondPcsValue: Number(o.diamond?.pcs) || '',
      diamondWeight: numOrDash(o.diamond?.weight),
      diamondWeightValue: Number(o.diamond?.weight) || '',
      diamondParticular: orDash(o.diamond?.particular),
    }
  })

  const columns = [
    {
      key: '__action',
      label: 'Action',
      sortable: false,
      className: 'w-24',
      render: (r) => (
        <button className="btn-gold btn-sm" onClick={() => setActiveOrderId(r.id)}>
          <PlayCircle size={13} /> Process
        </button>
      ),
    },
    { key: 'orderNumber', label: 'Order #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'productName', label: 'Article' },
    { key: 'quantity', label: 'Pcs' },
    ...ORDER_DATE_COLUMNS,
    { key: 'priority', label: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'assignedPerson', label: 'Assigned To' },
    { key: 'stageStatus', label: 'Stage Status', render: (r) => <StatusBadge status={r.stageStatus} /> },
    { key: 'stageTargetFmt', label: 'Stage Target', sortKey: 'stageTargetDate' },
    {
      key: 'delay',
      label: 'Delay',
      sortable: false,
      render: (r) => <DelayBadge state={r.delayInfo.state} days={r.delayInfo.delayDays} label={DELAY_STATE_META[r.delayInfo.state]?.label} />,
    },
    // New Order form details, in the form's own order. All shown by
    // default — each stage's team hides what it doesn't need via Columns.
    { key: 'salesPerson', label: 'Sales Person' },
    { key: 'orderType', label: 'Order Type' },
    { key: 'customerContact', label: 'Customer Contact' },
    { key: 'customerRefNumber', label: 'Customer Ref #' },
    {
      key: 'customerRequirement',
      label: 'Customer Requirement',
      render: (r) => (
        <span className="block md:max-w-xs md:truncate" title={r.customerRequirement}>
          {r.customerRequirement}
        </span>
      ),
    },
    { key: 'productCode', label: 'Product Code' },
    { key: 'size', label: 'Size' },
    {
      key: 'images',
      label: 'Reference Image',
      sortable: false,
      render: (r) => <ReferenceImagesButton images={r.referenceImage} onOpen={setViewingImages} />,
    },
    { key: 'metalType', label: 'Metal Type' },
    { key: 'metalPurity', label: 'Metal Purity' },
    { key: 'metalColour', label: 'Metal Colour' },
    { key: 'metalWeight', label: 'Metal Weight (g)', sortKey: 'metalWeightValue' },
    { key: 'diamondPcs', label: 'Diamond Pcs', sortKey: 'diamondPcsValue' },
    { key: 'diamondWeight', label: 'Diamond Weight (ct)', sortKey: 'diamondWeightValue' },
    { key: 'diamondParticular', label: 'Diamond Particular' },
  ]

  return (
    <div>
      <PageHeader title={stageMeta.label} subtitle={stageMeta.dept} />

      <div className="mb-4 flex flex-wrap gap-2">
        <TabPill active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pending ({queue.length})
        </TabPill>
        <TabPill active={tab === 'history'} onClick={() => setTab('history')}>
          History ({historyEntries.length})
        </TabPill>
      </div>

      {tab === 'pending' ? (
        <>
          <FilterBar
            fields={[
              { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Urgent'] },
              { key: 'assignedPerson', label: 'Assigned To', type: 'select', options: assignedPersons },
              { key: 'status', label: 'Stage Status', type: 'select', options: statuses },
            ]}
            value={filters}
            onChange={setFilters}
            onClear={() => setFilters({})}
          />
          <DataTable
            // Same component for every stage: remount per stage so each loads
            // its own saved column choice (and starts with a clean search).
            key={stageKey}
            columnsKey={`stage-queue:${stageKey}`}
            columns={columns}
            rows={rows}
            exportTitle={`${stageMeta.label} Queue`}
            searchPlaceholder="Search order #, customer, article…"
            emptyLabel="No orders are currently waiting at this stage."
          />
        </>
      ) : (
        <div className="card">
          <HistoryTable entries={historyEntries} showOrder />
        </div>
      )}

      <ReferenceImagesModal images={viewingImages} onClose={() => setViewingImages(null)} />

      <Modal
        open={!!activeOrder}
        onClose={() => setActiveOrderId(null)}
        title={activeOrder ? `${stageMeta.label} — ${activeOrder.orderNumber}` : ''}
        size="xl"
        footer={
          <button className="btn-outline" onClick={() => navigate(`/orders/${activeOrderId}/${routeForStage(stageKey)}`)}>
            <ExternalLink size={14} /> Open Full Order Page
          </button>
        }
      >
        {activeOrder && StageComponent && (
          <StageComponent
            order={activeOrder}
            employees={employees}
            masters={masters}
            onChanged={() => Orders.list().then(setOrders)}
            onCancel={() => setActiveOrderId(null)}
          />
        )}
      </Modal>
    </div>
  )
}
