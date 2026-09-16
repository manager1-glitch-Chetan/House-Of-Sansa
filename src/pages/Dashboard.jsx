import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  Sparkles,
  Factory,
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  Truck,
  CheckCircle2,
  Archive,
  Users2,
  Briefcase,
  ChevronRight,
  Flame,
  Gem,
  Clock3,
  Coins,
  Timer,
  Diamond,
} from 'lucide-react'
import { Orders, Customers, Employees, MaterialTransactions, dbEvents } from '@/lib/db'
import { applyFilters, computeDashboardData, computeTopCategories, computeTopClients, computeMaterialSnapshot } from '@/lib/analytics'
import { num } from '@/lib/utils'
import { buildReports } from '@/pages/reports/reportDefs'
import PageHeader from '@/components/common/PageHeader'
import SectionHeading from '@/components/common/SectionHeading'
import StatCard from '@/components/common/StatCard'
import FilterBar from '@/components/common/FilterBar'
import DataTable from '@/components/common/DataTable'
import { cx } from '@/lib/utils'
import ChartCard from '@/components/charts/ChartCard'
import SimpleBarChart from '@/components/charts/SimpleBarChart'
import SimplePieChart from '@/components/charts/SimplePieChart'
import SimpleLineChart from '@/components/charts/SimpleLineChart'

// The reports judged most important for day-to-day management — surfaced
// directly on the Dashboard now that the standalone Reports module is gone.
const KEY_REPORT_IDS = ['delayed-orders', 'stage-pending', 'employee-performance', 'order-completion']

export default function Dashboard() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filters, setFilters] = useState({})
  const [activeReportId, setActiveReportId] = useState(KEY_REPORT_IDS[0])
  const navigate = useNavigate()

  useEffect(() => {
    const load = () => {
      Orders.list().then(setOrders)
      Customers.list().then(setCustomers)
      Employees.list().then(setEmployees)
      MaterialTransactions.list().then(setTransactions)
    }
    load()
    dbEvents.addEventListener('change', load)
    return () => dbEvents.removeEventListener('change', load)
  }, [])

  const filtered = useMemo(() => applyFilters(orders, filters), [orders, filters])
  const data = useMemo(() => computeDashboardData(filtered), [filtered])
  const topCategories = useMemo(() => computeTopCategories(filtered), [filtered])
  const topClients = useMemo(() => computeTopClients(filtered), [filtered])
  const material = useMemo(() => computeMaterialSnapshot(transactions), [transactions])
  const onTimeCount = data.deliveryPerformance.find((d) => d.name === 'On Time')?.value || 0
  const delayedCount = data.deliveryPerformance.find((d) => d.name === 'Delayed')?.value || 0
  const onTimeRate = onTimeCount + delayedCount > 0 ? Math.round((onTimeCount / (onTimeCount + delayedCount)) * 100) : null
  const keyReports = useMemo(() => buildReports(filtered).filter((r) => KEY_REPORT_IDS.includes(r.id)), [filtered])
  const activeReport = keyReports.find((r) => r.id === activeReportId) || keyReports[0]

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

  const heroCards = [
    { label: 'Employees', value: employees.length, icon: Users2, sub: 'Total registered staff', tone: 'from-rose-50 to-white', onClick: () => navigate('/users') },
    { label: 'Active Orders', value: orders.filter((o) => o.overallStatus !== 'Closed').length, icon: Briefcase, sub: 'View all active orders', tone: 'from-sky-50 to-white', onClick: () => navigate('/orders') },
    { label: 'Clients', value: customers.length, icon: Users2, sub: 'Total registered customers', tone: 'from-amber-50 to-white', onClick: () => navigate('/masters') },
  ]

  const quickAccess = [
    { label: 'Order Planning Queue', icon: AlertTriangle, tone: 'text-red-600 bg-red-50', onClick: () => navigate('/stage/planning') },
    { label: 'Casting Queue', icon: Flame, tone: 'text-orange-600 bg-orange-50', onClick: () => navigate('/stage/casting') },
    { label: 'Diamond Setting Queue', icon: Gem, tone: 'text-violet-600 bg-violet-50', onClick: () => navigate('/stage/diamond-setting') },
    { label: 'Packing Queue', icon: Package, tone: 'text-emerald-600 bg-emerald-50', onClick: () => navigate('/stage/packing') },
  ]

  const statusCards = [
    { key: 'total', label: 'Total Orders', value: data.cards.total, icon: Package, tone: 'dark' },
    { key: 'newOrders', label: 'New Orders', value: data.cards.newOrders, icon: Sparkles, tone: 'gold' },
    { key: 'inProduction', label: 'Orders in Production', value: data.cards.inProduction, icon: Factory },
    { key: 'delayed', label: 'Orders Delayed', value: data.cards.delayed, icon: AlertTriangle, tone: 'danger' },
    { key: 'dueToday', label: 'Orders Due Today', value: data.cards.dueToday, icon: CalendarClock },
    { key: 'dueThisWeek', label: 'Orders Due This Week', value: data.cards.dueThisWeek, icon: CalendarRange },
    { key: 'readyForDelivery', label: 'Ready for Delivery', value: data.cards.readyForDelivery, icon: Truck },
    { key: 'delivered', label: 'Delivered', value: data.cards.delivered, icon: CheckCircle2, tone: 'success' },
    { key: 'closed', label: 'Closed Orders', value: data.cards.closed, icon: Archive },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Complete order-to-delivery visibility for House of Sansa, Raipur."
        actions={
          <button className="btn-gold" onClick={() => navigate('/orders/new')}>
            + New Order
          </button>
        }
      />

      {/* Hero summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {heroCards.map((c) => (
          <button key={c.label} onClick={c.onClick} className={`card bg-gradient-to-br ${c.tone} p-5 text-left transition-shadow hover:shadow-md`}>
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-hos-ink-500">{c.label}</span>
              <c.icon size={20} className="text-hos-ink-400" />
            </div>
            <div className="mt-2 font-display text-4xl font-bold text-hos-ink-900">{c.value}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-hos-gold-600">
              {c.sub} <ChevronRight size={12} />
            </div>
          </button>
        ))}
      </div>

      {/* Quick access */}
      <div className="mt-6">
        <SectionHeading>Quick Access</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickAccess.map((q) => (
            <button key={q.label} onClick={q.onClick} className="card flex items-center gap-3 p-3.5 text-left hover:shadow-md">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${q.tone}`}>
                <q.icon size={17} />
              </span>
              <span className="flex-1 text-sm font-semibold text-hos-ink-800">{q.label}</span>
              <ChevronRight size={15} className="text-hos-ink-300" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <SectionHeading>Filters</SectionHeading>
        <FilterBar fields={filterFields} value={filters} onChange={setFilters} onClear={() => setFilters({})} />
      </div>

      {/* Customised orders status */}
      <div className="mt-2">
        <SectionHeading>Customised Orders Status</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statusCards.map((c) => (
            <StatCard key={c.key} label={c.label} value={c.value} icon={c.icon} tone={c.tone} onClick={() => navigate('/orders')} />
          ))}
        </div>
      </div>

      {/* Material & performance snapshot — the real-time "how are we doing right now" numbers */}
      <div className="mt-6">
        <SectionHeading>On-Time &amp; Material Snapshot</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="On-Time Delivery Rate"
            value={onTimeRate == null ? '—' : `${onTimeRate}%`}
            sub={`${onTimeCount} on time / ${delayedCount} delayed`}
            icon={Timer}
            tone={onTimeRate != null && onTimeRate < 70 ? 'danger' : 'success'}
          />
          <StatCard label="Today's Gold Used" value={`${num(material.todayGoldUsed)} g`} icon={Coins} tone="gold" />
          <StatCard label="Gold Pending" value={`${num(material.goldPending)} g`} sub="Issued but not yet finalised" icon={Clock3} />
          <StatCard label="Today's Diamond Used" value={`${num(material.todayDiamondUsed, 0)} pcs`} icon={Diamond} />
          <StatCard label="Diamond Pending" value={`${num(material.diamondPending, 0)} pcs`} sub="Issued but not yet set/returned" icon={Clock3} />
        </div>
      </div>

      {/* Top categories & top clients */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionHeading>Top Selling Categories</SectionHeading>
          <div className="card p-4">
            {topCategories.length === 0 && <p className="py-6 text-center text-sm text-hos-ink-400">No orders yet.</p>}
            <div className="space-y-3">
              {topCategories.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-hos-ink-800">{c.name}</span>
                    <span className="text-hos-ink-500">
                      {c.count} orders <span className="text-hos-ink-400">{c.pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-hos-ink-100">
                    <div className="h-full rounded-full bg-hos-gold-500" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <SectionHeading>Top 5 Client Orders</SectionHeading>
          <div className="card divide-y divide-hos-ink-100">
            {topClients.length === 0 && <p className="py-6 text-center text-sm text-hos-ink-400">No orders yet.</p>}
            {topClients.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-hos-gold-100 text-xs font-bold text-hos-gold-700">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-hos-ink-800">{c.name}</span>
                <span className="rounded-full bg-hos-ink-100 px-2.5 py-0.5 text-xs font-semibold text-hos-ink-600">{c.count} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="mt-6">
        <SectionHeading>Analytics</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="Order Status" subtitle="Distribution across all statuses">
            <SimplePieChart data={data.orderStatusChart} />
          </ChartCard>
          <ChartCard title="Stage-wise Pending Orders" subtitle="Orders currently sitting at each stage">
            <SimpleBarChart data={data.stageWisePending} />
          </ChartCard>
          <ChartCard title="Department-wise Workload" subtitle="Active orders per department">
            <SimpleBarChart data={data.deptWorkload} colorByIndex />
          </ChartCard>
          <ChartCard title="Delayed Orders" subtitle="Orders overdue or completed late, by stage">
            <SimpleBarChart data={data.delayedByStage} color="#d03b3b" />
          </ChartCard>
          <ChartCard title="Monthly Orders" subtitle="Orders received over the last 6 months">
            <SimpleLineChart data={data.monthlyOrders} />
          </ChartCard>
          <ChartCard title="Delivery Performance" subtitle="On-time vs delayed deliveries">
            <SimplePieChart data={data.deliveryPerformance} />
          </ChartCard>
          <ChartCard title="Production Stage Performance" subtitle="Average delay (days) per stage" height={280}>
            <SimpleBarChart data={data.stagePerformance} horizontal color="#eda100" />
          </ChartCard>
        </div>
      </div>

      {/* Key reports — the reports management needs most often, right here */}
      {activeReport && (
        <div className="mt-6">
          <SectionHeading>Key Reports</SectionHeading>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {keyReports.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReportId(r.id)}
                className={cx(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  activeReport.id === r.id ? 'bg-hos-gold-500 text-white' : 'bg-white text-hos-ink-600 hover:bg-hos-ink-100'
                )}
              >
                {r.title} <span className="ml-1 text-xs opacity-70">({r.rows.length})</span>
              </button>
            ))}
          </div>
          <DataTable columns={activeReport.columns} rows={activeReport.rows} exportTitle={activeReport.title} emptyLabel="No records match this report yet." />
        </div>
      )}
    </div>
  )
}
