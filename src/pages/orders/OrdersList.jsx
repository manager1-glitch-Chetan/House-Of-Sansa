import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Filter, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Orders, Customers, Employees, Products, Masters, dbEvents } from '@/lib/db'
import { applyFilters } from '@/lib/analytics'
import PageHeader from '@/components/common/PageHeader'
import FilterBar from '@/components/common/FilterBar'
import DataTable from '@/components/common/DataTable'
import Tabs from '@/components/common/Tabs'
import { ReferenceImagesButton, ReferenceImagesModal } from '@/components/common/ReferenceImages'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/Badge'
import { ORDER_OVERALL_STATUS, stageLabel } from '@/lib/constants'
import { cx, stageDelayFor, delayText, orderDateFields, ORDER_DATE_COLUMNS, DELAY_STATE_META } from '@/lib/utils'
import { DelayBadge } from '@/components/common/Badge'
import EditOrderModal from './EditOrderModal'
import NewOrderModal from './NewOrderModal'

// Status tabs above the register. Hold (and any status not listed here)
// only gets a tab while some order actually has it.
const STATUS_TABS = [
  ORDER_OVERALL_STATUS.NEW,
  ORDER_OVERALL_STATUS.IN_PRODUCTION,
  ORDER_OVERALL_STATUS.DELAYED,
  ORDER_OVERALL_STATUS.READY_FOR_DELIVERY,
  ORDER_OVERALL_STATUS.DELIVERED,
  ORDER_OVERALL_STATUS.CLOSED,
]

export default function OrdersList() {
  const navigate = useNavigate()
  const location = useLocation()
  const confirm = useConfirm()
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [productsMaster, setProductsMaster] = useState([])
  const [masters, setMasters] = useState({})
  const [filters, setFilters] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [viewingImages, setViewingImages] = useState(null)
  // "+ New Order" elsewhere (Dashboard, old /orders/new links) arrives with
  // this flag and should land with the popup already open.
  const [newOrderOpen, setNewOrderOpen] = useState(() => !!location.state?.newOrder)
  const [savedNumbers, setSavedNumbers] = useState(null)

  // Clear the flag so Back/refresh onto this history entry doesn't reopen it.
  useEffect(() => {
    if (location.state?.newOrder) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    const load = () => {
      Orders.list().then(setOrders)
      Customers.list().then(setCustomers)
    }
    load()
    Employees.list().then(setEmployees)
    Products.list().then(setProductsMaster)
    Masters.listAll().then(setMasters)
    dbEvents.addEventListener('change', load)
    return () => dbEvents.removeEventListener('change', load)
  }, [])

  useEffect(() => {
    if (!savedNumbers) return
    const t = setTimeout(() => setSavedNumbers(null), 6000)
    return () => clearTimeout(t)
  }, [savedNumbers])

  const removeOrder = async (order) => {
    const ok = await confirm({
      title: 'Delete Order',
      message: `Delete order ${order.orderNumber} (${order.customerName})? This cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete',
    })
    if (ok) await Orders.remove(order.id)
  }

  // Status is driven by the tabs; everything else by the (collapsible)
  // filter panel. Keeping them apart keeps the panel's own "(n)" count and
  // Clear button about the panel's fields only.
  const { status: statusFilter = '', ...panelFilters } = filters
  const panelFilterCount = Object.values(panelFilters).filter((v) => v !== '' && v != null).length

  // Newest first (order numbers are sequential), so freshly saved orders
  // land on page 1. Clicking a column header still re-sorts.
  const filtered = useMemo(
    () => applyFilters(orders, filters).sort((a, b) => String(b.orderNumber).localeCompare(String(a.orderNumber), undefined, { numeric: true })),
    [orders, filters]
  )
  const { statusCounts, statusTotal } = useMemo(() => {
    const list = applyFilters(orders, { ...filters, status: '' })
    const counts = {}
    for (const o of list) if (o.overallStatus) counts[o.overallStatus] = (counts[o.overallStatus] || 0) + 1
    return { statusCounts: counts, statusTotal: list.length }
  }, [orders, filters])

  const extraStatuses = Object.keys(statusCounts).filter((s) => !STATUS_TABS.includes(s))
  const statusTabs = [
    { key: '', label: 'All', badge: statusTotal },
    ...[...STATUS_TABS, ...extraStatuses].map((s) => ({ key: s, label: s, badge: statusCounts[s] || 0 })),
  ]

  const salesPersons = [...new Set(orders.map((o) => o.salesPerson).filter(Boolean))]
  const products = [...new Set(orders.map((o) => o.productName).filter(Boolean))]

  const filterFields = [
    { key: 'orderNumber', label: 'Order Number', type: 'text' },
    { key: 'customer', label: 'Customer', type: 'select', options: customers.map((c) => c.name) },
    { key: 'salesPerson', label: 'Sales Person', type: 'select', options: salesPersons },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Urgent'] },
    { key: 'product', label: 'Product', type: 'select', options: products },
    { key: 'dateFrom', label: 'Date From', type: 'date' },
    { key: 'dateTo', label: 'Date To', type: 'date' },
  ]

  const rows = filtered.map((o) => {
    const delayInfo = stageDelayFor(o, o.currentStage)
    return {
      ...o,
      ...orderDateFields(o),
      currentStageLabel: stageLabel(o.currentStage),
      delayInfo,
      delay: delayText(delayInfo),
    }
  })

  // Action stays the first column: the register is wide and scrolls
  // sideways, so edit/delete must not end up off-screen.
  const columns = [
    {
      key: '__actions',
      label: 'Action',
      sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          <button
            className="rounded p-1.5 text-hos-ink-400 hover:bg-hos-gold-50 hover:text-hos-gold-600"
            title="Edit Order"
            onClick={(e) => {
              e.stopPropagation()
              setEditingOrder(row)
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            className="rounded p-1.5 text-hos-ink-400 hover:bg-red-50 hover:text-red-600"
            title="Delete Order"
            onClick={(e) => {
              e.stopPropagation()
              removeOrder(row)
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
    { key: 'orderNumber', label: 'Order #', render: (r) => <span className="font-semibold text-hos-ink-900">{r.orderNumber}</span> },
    {
      key: 'customerName',
      label: 'Customer',
      render: (r) => (
        <div>
          <div className="font-medium text-hos-ink-800">{r.customerName}</div>
          {r.customerContact && <div className="text-xs text-hos-ink-400">{r.customerContact}</div>}
        </div>
      ),
    },
    { key: 'productName', label: 'Article' },
    { key: 'quantity', label: 'Qty' },
    { key: 'priority', label: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'currentStageLabel', label: 'Current Stage' },
    { key: 'overallStatus', label: 'Status', render: (r) => <StatusBadge status={r.overallStatus} /> },
    ...ORDER_DATE_COLUMNS,
    {
      key: 'delay',
      label: 'Delay',
      sortable: false,
      render: (r) => <DelayBadge state={r.delayInfo.state} days={r.delayInfo.delayDays} label={DELAY_STATE_META[r.delayInfo.state]?.label} />,
    },
    { key: 'salesPerson', label: 'Sales Person' },
    {
      key: 'images',
      label: 'Images',
      sortable: false,
      render: (r) => <ReferenceImagesButton images={r.referenceImage} onOpen={setViewingImages} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Track every order from receipt to delivery."
        actions={
          <button className="btn-gold" onClick={() => setNewOrderOpen(true)}>
            <Plus size={16} /> New Order
          </button>
        }
      />

      {savedNumbers && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
          <span className="flex-1">
            {savedNumbers.length === 1 ? (
              <>
                Order <strong>{savedNumbers[0]}</strong> created successfully.
              </>
            ) : (
              <>
                {savedNumbers.length} orders created: <strong>{savedNumbers.join(', ')}</strong>
              </>
            )}
          </span>
          <button className="rounded p-1 text-emerald-600 hover:bg-emerald-100" title="Dismiss" onClick={() => setSavedNumbers(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="mb-4">
        <Tabs tabs={statusTabs} active={statusFilter} onChange={(s) => setFilters((f) => ({ ...f, status: s }))} />
      </div>

      {filtersOpen && (
        <FilterBar
          fields={filterFields}
          value={panelFilters}
          onChange={(v) => setFilters({ ...v, status: statusFilter })}
          onClear={() => setFilters({ status: statusFilter })}
        />
      )}

      <DataTable
        columns={columns}
        rows={rows}
        exportTitle="Order Register"
        searchPlaceholder="Search order #, customer, article…"
        emptyLabel="No orders match these filters."
        columnsKey="orders"
        onRowClick={(r) => navigate(`/orders/${r.id}`)}
        toolbarExtra={
          <button
            className={cx('btn-outline btn-sm', (filtersOpen || panelFilterCount > 0) && 'border-hos-gold-300 bg-hos-gold-50 text-hos-gold-700')}
            onClick={() => setFiltersOpen((v) => !v)}
            title="Show / hide filters"
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filters</span>
            {panelFilterCount > 0 && (
              <span className="rounded-full bg-hos-gold-500 px-1.5 text-[10px] font-bold leading-4 text-white">{panelFilterCount}</span>
            )}
          </button>
        }
      />

      {newOrderOpen && (
        <NewOrderModal
          onClose={() => setNewOrderOpen(false)}
          onSaved={(created) => {
            setNewOrderOpen(false)
            setSavedNumbers(created.map((o) => o.orderNumber))
          }}
        />
      )}

      <EditOrderModal
        key={editingOrder?.id || 'closed'}
        order={editingOrder}
        masters={masters}
        customers={customers}
        employees={employees}
        products={productsMaster}
        onClose={() => setEditingOrder(null)}
      />

      <ReferenceImagesModal images={viewingImages} onClose={() => setViewingImages(null)} />
    </div>
  )
}
