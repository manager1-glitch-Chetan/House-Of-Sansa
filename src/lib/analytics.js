import { STAGES, STAGE_KEYS, ORDER_OVERALL_STATUS } from './constants'
import { computeDelay, daysBetween, todayISO } from './utils'

import { TERMINAL_STATUSES as TERMINAL } from '@/lib/constants'

// Live "how many orders are sitting at each stage right now" — powers the
// sidebar badge counts and the per-stage work-queue pages.
export function computeStageCounts(orders) {
  const counts = {}
  STAGE_KEYS.forEach((k) => (counts[k] = 0))
  orders.forEach((o) => {
    if (counts[o.currentStage] != null) counts[o.currentStage]++
  })
  return counts
}

export function computeTopCategories(orders, limit = 5) {
  const counts = {}
  orders.forEach((o) => {
    const name = o.productName || 'Unspecified'
    counts[name] = (counts[name] || 0) + 1
  })
  const total = orders.length || 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
}

export function computeTopClients(orders, limit = 5) {
  const counts = {}
  orders.forEach((o) => {
    const name = o.customerName || 'Unknown'
    counts[name] = (counts[name] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

// Gold/diamond usage right now — "how much did we use today" and "how much
// is still out with a department, unaccounted for" — from the material
// transaction ledger every stage's Submit action writes to.
export function computeMaterialSnapshot(transactions) {
  const today = todayISO()
  const sum = (list, key) => list.reduce((s, t) => s + (Number(t[key]) || 0), 0)
  const of = (material, type) => transactions.filter((t) => t.material === material && t.type === type)

  const todayGoldUsed = sum(of('gold', 'Consumed').filter((t) => t.at?.slice(0, 10) === today), 'weight')
  const todayDiamondUsed = sum(of('diamond', 'Consumed').filter((t) => t.at?.slice(0, 10) === today), 'qty')

  const goldIssued = sum(of('gold', 'Issued'), 'weight')
  const goldFinal = sum(of('gold', 'Final'), 'weight')
  const goldPending = Math.max(0, goldIssued - goldFinal)

  const diamondIssued = sum(of('diamond', 'Issued'), 'qty')
  const diamondAccounted = sum([...of('diamond', 'Consumed'), ...of('diamond', 'Broken/Lost')], 'qty')
  const diamondPending = Math.max(0, diamondIssued - diamondAccounted)

  return { todayGoldUsed, todayDiamondUsed, goldIssued, goldFinal, goldPending, diamondIssued, diamondPending }
}

export function applyFilters(orders, f = {}) {
  return orders.filter((o) => {
    if (f.orderNumber && !o.orderNumber?.toLowerCase().includes(f.orderNumber.toLowerCase())) return false
    if (f.customer && o.customerName !== f.customer) return false
    if (f.salesPerson && o.salesPerson !== f.salesPerson) return false
    if (f.priority && o.priority !== f.priority) return false
    if (f.product && o.productName !== f.product) return false
    if (f.status && o.overallStatus !== f.status) return false
    if (f.assignedPerson) {
      const anyMatch = STAGE_KEYS.some((k) => o.stages[k]?.assignedPerson === f.assignedPerson)
      if (!anyMatch) return false
    }
    if (f.dateFrom && o.orderDate < f.dateFrom) return false
    if (f.dateTo && o.orderDate > f.dateTo) return false
    return true
  })
}

export function computeDashboardData(orders) {
  const today = todayISO()
  const weekAhead = new Date()
  weekAhead.setDate(weekAhead.getDate() + 7)
  const weekAheadISO = weekAhead.toISOString().slice(0, 10)

  const notClosed = orders.filter((o) => o.overallStatus !== ORDER_OVERALL_STATUS.CLOSED)

  const cards = {
    total: orders.length,
    newOrders: orders.filter((o) => o.overallStatus === ORDER_OVERALL_STATUS.NEW).length,
    inProduction: orders.filter((o) => o.overallStatus === ORDER_OVERALL_STATUS.IN_PRODUCTION).length,
    delayed: orders.filter((o) => o.overallStatus === ORDER_OVERALL_STATUS.DELAYED).length,
    dueToday: notClosed.filter((o) => o.targetDeliveryDate === today).length,
    dueThisWeek: notClosed.filter((o) => o.targetDeliveryDate && o.targetDeliveryDate >= today && o.targetDeliveryDate <= weekAheadISO).length,
    readyForDelivery: orders.filter((o) => o.overallStatus === ORDER_OVERALL_STATUS.READY_FOR_DELIVERY).length,
    delivered: orders.filter((o) => o.overallStatus === ORDER_OVERALL_STATUS.DELIVERED).length,
    closed: orders.filter((o) => o.overallStatus === ORDER_OVERALL_STATUS.CLOSED).length,
  }

  // 1. Order status distribution
  const statusCounts = {}
  orders.forEach((o) => {
    statusCounts[o.overallStatus] = (statusCounts[o.overallStatus] || 0) + 1
  })
  const orderStatusChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  // 2. Stage-wise pending orders (orders currently sitting at each stage, excluding closed)
  const stageWisePending = STAGES.filter((s) => s.key !== 'closed').map((s) => ({
    name: s.label,
    value: orders.filter((o) => o.currentStage === s.key).length,
  }))

  // 3. Department-wise workload (based on current stage's department)
  const deptCounts = {}
  orders.forEach((o) => {
    if (o.currentStage === 'closed') return
    const dept = STAGES.find((s) => s.key === o.currentStage)?.dept || 'Other'
    deptCounts[dept] = (deptCounts[dept] || 0) + 1
  })
  const deptWorkload = Object.entries(deptCounts).map(([name, value]) => ({ name, value }))

  // 4. Delayed orders by stage
  const delayedByStage = STAGES.filter((s) => s.key !== 'closed').map((s) => {
    const count = orders.filter((o) => {
      const rec = o.stages?.[s.key]
      if (!rec?.targetDate) return false
      const terminal = TERMINAL.includes(rec.status)
      const info = computeDelay({ targetDate: rec.targetDate, completionDate: rec.completionDate, status: rec.status, isTerminal: terminal })
      return info.state === 'delayed' || info.state === 'completed-late'
    }).length
    return { name: s.label, value: count }
  })

  // 5. Monthly orders (last 6 months)
  const monthBuckets = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), value: 0 })
  }
  orders.forEach((o) => {
    if (!o.orderDate) return
    const d = new Date(o.orderDate)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = monthBuckets.find((b) => b.key === key)
    if (bucket) bucket.value++
  })
  const monthlyOrders = monthBuckets.map(({ name, value }) => ({ name, value }))

  // 6. Delivery performance (on-time vs delayed, among orders that reached delivery)
  const deliveredOrders = orders.filter((o) => ['Delivered'].includes(o.stages?.delivery?.status))
  let onTime = 0
  let late = 0
  deliveredOrders.forEach((o) => {
    const rec = o.stages?.delivery
    if (!rec) return
    const info = computeDelay({ targetDate: rec.targetDate, completionDate: rec.completionDate, status: rec.status, isTerminal: true })
    if (info.state === 'completed-late') late++
    else onTime++
  })
  const deliveryPerformance = [
    { name: 'On Time', value: onTime },
    { name: 'Delayed', value: late },
  ]

  // 7. Production stage performance (avg delay days for completed stages)
  const stagePerformance = STAGES.filter((s) => !['orderReceived', 'closed'].includes(s.key)).map((s) => {
    const completed = orders
      .map((o) => o.stages?.[s.key])
      .filter((rec) => rec && TERMINAL.includes(rec.status) && rec.targetDate && rec.completionDate)
    const avg = completed.length
      ? Math.round((completed.reduce((sum, rec) => sum + Math.max(0, daysBetween(rec.targetDate, rec.completionDate)), 0) / completed.length) * 10) / 10
      : 0
    return { name: s.label, value: avg }
  })

  return {
    cards,
    orderStatusChart,
    stageWisePending,
    deptWorkload,
    delayedByStage,
    monthlyOrders,
    deliveryPerformance,
    stagePerformance,
  }
}
