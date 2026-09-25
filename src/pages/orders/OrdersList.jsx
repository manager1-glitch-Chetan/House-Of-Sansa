import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Orders, Customers, Employees, Products, Masters, dbEvents } from '@/lib/db'
import { applyFilters } from '@/lib/analytics'
import PageHeader from '@/components/common/PageHeader'
import FilterBar from '@/components/common/FilterBar'
import DataTable from '@/components/common/DataTable'
import { ReferenceImagesButton, ReferenceImagesModal } from '@/components/common/ReferenceImages'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/Badge'
import { stageLabel } from '@/lib/constants'
import { stageDelayFor, delayText, orderDateFields, ORDER_DATE_COLUMNS, DELAY_STATE_META } from '@/lib/utils'
import { DelayBadge } from '@/components/common/Badge'
import EditOrderModal from './EditOrderModal'

export default function OrdersList() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [productsMaster, setProductsMaster] = useState([])
  const [masters, setMasters] = useState({})
  const [filters, setFilters] = useState({})
  const [editingOrder, setEditingOrder] = useState(null)
  const [viewingImages, setViewingImages] = useState(null)
  const navigate = useNavigate()
  const confirm = useConfirm()

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

  const removeOrder = async (order) => {
    const ok = await confirm({
      title: 'Delete Order',
      message: `Delete order ${order.orderNumber} (${order.customerName})? This cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete',
    })
    if (ok) await Orders.remove(order.id)
  }

  const filtered = useMemo(() => applyFilters(orders, filters), [orders, filters])

  const salesPersons = [...new Set(orders.map((o) => o.salesPerson).filter(Boolean))]
  const products = [...new Set(orders.map((o) => o.productName).filter(Boolean))]
  const statuses = [...new Set(orders.map((o) => o.overallStatus).filter(Boolean))]

  const filterFields = [
    { key: 'orderNumber', label: 'Order Number', type: 'text' },
    { key: 'customer', label: 'Customer', type: 'select', options: customers.map((c) => c.name) },
    { key: 'salesPerson', label: 'Sales Person', type: 'select', options: salesPersons },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Urgent'] },
    { key: 'product', label: 'Product', type: 'select', options: products },
    { key: 'status', label: 'Status', type: 'select', options: statuses },
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
    { key: 'orderNumber', label: 'Order #' },
    { key: 'customerName', label: 'Customer' },
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
        subtitle={`${filtered.length} of ${orders.length} orders`}
        actions={
          <button className="btn-gold" onClick={() => navigate('/orders/new')}>
            + New Order
          </button>
        }
      />
      <FilterBar fields={filterFields} value={filters} onChange={setFilters} onClear={() => setFilters({})} />
      <DataTable
        columns={columns}
        rows={rows}
        exportTitle="Order Register"
        searchPlaceholder="Search order #, customer, article…"
        onRowClick={(r) => navigate(`/orders/${r.id}`)}
      />

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
