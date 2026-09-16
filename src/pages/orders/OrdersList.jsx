import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Orders, Customers, dbEvents } from '@/lib/db'
import { applyFilters } from '@/lib/analytics'
import PageHeader from '@/components/common/PageHeader'
import FilterBar from '@/components/common/FilterBar'
import DataTable from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/Badge'
import { stageLabel, TERMINAL_STATUSES } from '@/lib/constants'
import { formatDate, computeDelay } from '@/lib/utils'
import { DelayBadge } from '@/components/common/Badge'
import { DELAY_STATE_META } from '@/lib/utils'

export default function OrdersList() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [filters, setFilters] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    const load = () => {
      Orders.list().then(setOrders)
      Customers.list().then(setCustomers)
    }
    load()
    dbEvents.addEventListener('change', load)
    return () => dbEvents.removeEventListener('change', load)
  }, [])

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
    const stageRec = o.stages?.[o.currentStage] || {}
    const terminal = TERMINAL_STATUSES.includes(stageRec.status)
    const delayInfo = computeDelay({ targetDate: stageRec.targetDate, completionDate: stageRec.completionDate, status: stageRec.status, isTerminal: terminal })
    return {
      ...o,
      currentStageLabel: stageLabel(o.currentStage),
      delayInfo,
      targetDeliveryDateFmt: formatDate(o.targetDeliveryDate),
    }
  })

  const columns = [
    { key: 'orderNumber', label: 'Order #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'productName', label: 'Article' },
    { key: 'quantity', label: 'Qty' },
    { key: 'priority', label: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'currentStageLabel', label: 'Current Stage' },
    { key: 'overallStatus', label: 'Status', render: (r) => <StatusBadge status={r.overallStatus} /> },
    { key: 'targetDeliveryDateFmt', label: 'Target Delivery' },
    {
      key: 'delay',
      label: 'Delay',
      sortable: false,
      render: (r) => <DelayBadge state={r.delayInfo.state} days={r.delayInfo.delayDays} label={DELAY_STATE_META[r.delayInfo.state]?.label} />,
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
    </div>
  )
}
