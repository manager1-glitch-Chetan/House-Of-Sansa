import { STAGES, STAGE_KEYS } from '@/lib/constants'
import { computeDelay, daysBetween, delayText, formatDate, num, orderDateFields, ORDER_DATE_COLUMNS } from '@/lib/utils'

import { TERMINAL_STATUSES as TERMINAL } from '@/lib/constants'

// fallbackTarget: the order's Expected Delivery Date, used when the stage
// has no target of its own (same rule as the stage queues — see stageDelayFor).
function delayDaysFor(rec, fallbackTarget) {
  if (!rec) return { state: 'not-set', delayDays: 0 }
  const terminal = TERMINAL.includes(rec.status)
  return computeDelay({ targetDate: rec.targetDate || fallbackTarget, completionDate: rec.completionDate, status: rec.status, isTerminal: terminal })
}

export function buildReports(orders) {
  return [
    {
      id: 'order-register',
      title: 'Order Register',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'salesPerson', label: 'Sales Person' },
        { key: 'productName', label: 'Article' },
        { key: 'quantity', label: 'Qty' },
        { key: 'priority', label: 'Priority' },
        { key: 'overallStatus', label: 'Status' },
      ],
      rows: orders.map((o) => ({ ...o, ...orderDateFields(o) })),
    },
    {
      id: 'production-status',
      title: 'Production Status Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'productName', label: 'Article' },
        { key: 'currentStageLabel', label: 'Current Stage' },
        { key: 'currentStageStatus', label: 'Stage Status' },
        { key: 'overallStatus', label: 'Overall Status' },
      ],
      rows: orders.map((o) => ({
        ...o,
        ...orderDateFields(o),
        currentStageLabel: STAGES.find((s) => s.key === o.currentStage)?.label,
        currentStageStatus: o.stages?.[o.currentStage]?.status,
      })),
    },
    {
      id: 'stage-pending',
      title: 'Stage Pending Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'stageLabel', label: 'Pending Stage' },
        { key: 'assignedPerson', label: 'Assigned Person' },
        { key: 'targetDateFmt', label: 'Stage Target', sortKey: 'targetDate' },
        { key: 'delayLabel', label: 'Delay' },
      ],
      rows: orders
        .filter((o) => o.currentStage !== 'closed')
        .map((o) => {
          const rec = o.stages?.[o.currentStage]
          const info = delayDaysFor(rec, o.targetDeliveryDate)
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            ...orderDateFields(o),
            stageLabel: STAGES.find((s) => s.key === o.currentStage)?.label,
            assignedPerson: rec?.assignedPerson || '—',
            targetDate: rec?.targetDate || '',
            targetDateFmt: formatDate(rec?.targetDate),
            delayLabel: delayText(info),
          }
        }),
    },
    {
      id: 'delayed-orders',
      title: 'Delayed Order Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'stageLabel', label: 'Delayed Stage' },
        { key: 'assignedPerson', label: 'Assigned Person' },
        { key: 'targetDateFmt', label: 'Stage Target', sortKey: 'targetDate' },
        { key: 'delayDays', label: 'Delay (days)' },
      ],
      rows: orders.flatMap((o) =>
        STAGE_KEYS.filter((k) => k !== 'closed')
          // The stage the order is sitting at also counts as delayed once
          // it's past Expected Delivery, even without a stage target.
          .map((k) => ({ k, rec: o.stages?.[k], fallback: k === o.currentStage ? o.targetDeliveryDate : undefined }))
          .filter(({ rec, fallback }) => rec && (rec.targetDate || fallback))
          .map(({ k, rec, fallback }) => ({ k, rec, info: delayDaysFor(rec, fallback) }))
          .filter(({ info }) => info.state === 'delayed' || info.state === 'completed-late')
          .map(({ k, rec, info }) => ({
            id: `${o.id}-${k}`,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            ...orderDateFields(o),
            stageLabel: STAGES.find((s) => s.key === k)?.label,
            assignedPerson: rec?.assignedPerson || '—',
            targetDate: rec?.targetDate || '',
            targetDateFmt: formatDate(rec?.targetDate),
            delayDays: info.delayDays,
          }))
      ),
    },
    {
      id: 'cad-pending',
      title: 'CAD Pending Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'designer', label: 'Designer' },
        { key: 'cadVersion', label: 'CAD Version' },
        { key: 'status', label: 'CAD Status' },
      ],
      rows: orders
        .filter((o) => o.stages?.cad && o.stages.cad.status !== 'Approved' && o.stages.cad.status !== 'Pending')
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          ...orderDateFields(o),
          designer: o.stages?.cad?.designerName || o.stages?.cad?.assignedPerson || '—',
          cadVersion: o.stages?.cad?.cadVersion || '—',
          status: o.stages?.cad?.status,
        })),
    },
    {
      id: 'casting-report',
      title: 'Casting Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'castingDateFmt', label: 'Casting Date' },
        { key: 'goldWeight', label: 'Gold Weight (g)' },
        { key: 'plannedPcs', label: 'Planned PCS' },
        { key: 'castedPcs', label: 'Casted PCS' },
        { key: 'goodPcs', label: 'Good PCS' },
        { key: 'rejectedPcs', label: 'Rejected PCS' },
      ],
      rows: orders
        .filter((o) => o.stages?.casting?.goldWeight)
        .map((o) => {
          const c = o.stages?.casting || {}
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            ...orderDateFields(o),
            castingDateFmt: formatDate(c.castingDate),
            goldWeight: num(c.goldWeight),
            plannedPcs: c.plannedPcs || 0,
            castedPcs: c.castedPcs || 0,
            goodPcs: Math.max(0, (Number(c.castedPcs) || 0) - (Number(c.rejectedPcs) || 0)),
            rejectedPcs: c.rejectedPcs || 0,
          }
        }),
    },
    {
      id: 'diamond-issue-consumption',
      title: 'Diamond Issue / Consumption Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'issuedPcs', label: 'Issued PCS' },
        { key: 'usedPcs', label: 'Used PCS' },
        { key: 'returnedPcs', label: 'Returned PCS' },
        { key: 'brokenLostPcs', label: 'Broken/Lost PCS' },
        { key: 'balancePcs', label: 'Balance PCS' },
      ],
      rows: orders
        .filter((o) => o.stages?.diamondSetting?.issuedPcs)
        .map((o) => {
          const d = o.stages?.diamondSetting || {}
          const balance = (Number(d.issuedPcs) || 0) - (Number(d.usedPcs) || 0) - (Number(d.returnedPcs) || 0) - (Number(d.brokenLostPcs) || 0)
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            ...orderDateFields(o),
            issuedPcs: d.issuedPcs || 0,
            usedPcs: d.usedPcs || 0,
            returnedPcs: d.returnedPcs || 0,
            brokenLostPcs: d.brokenLostPcs || 0,
            balancePcs: balance,
          }
        }),
    },
    {
      id: 'diamond-loss',
      title: 'Diamond Loss Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'brokenLostPcs', label: 'Broken/Lost PCS' },
        { key: 'brokenLostWeight', label: 'Broken/Lost Weight (ct)' },
        { key: 'setter', label: 'Diamond Setter' },
      ],
      rows: orders
        .filter((o) => Number(o.stages?.diamondSetting?.brokenLostPcs) > 0)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          ...orderDateFields(o),
          brokenLostPcs: o.stages?.diamondSetting?.brokenLostPcs,
          brokenLostWeight: num(o.stages?.diamondSetting?.brokenLostWeight),
          setter: o.stages?.diamondSetting?.assignedPerson || '—',
        })),
    },
    {
      id: 'gold-consumption',
      title: 'Gold Consumption Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'estimated', label: 'Estimated (g)' },
        { key: 'actual', label: 'Actual (Casting) (g)' },
        { key: 'final', label: 'Final (Packing) (g)' },
      ],
      rows: orders
        .filter((o) => o.gold?.estimatedWeight || o.stages?.casting?.goldWeight)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          ...orderDateFields(o),
          estimated: num(o.gold?.estimatedWeight),
          actual: num(o.stages?.casting?.goldWeight),
          final: num(o.stages?.packing?.finalGoldWeight || o.stages?.casting?.goldWeight),
        })),
    },
    {
      id: 'qc-rejection',
      title: 'QC Rejection Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'stageLabel', label: 'Stage' },
        { key: 'at', label: 'Date' },
        { key: 'user', label: 'By' },
        { key: 'remarks', label: 'Remarks' },
      ],
      rows: orders.flatMap((o) =>
        (o.history || [])
          .filter((h) => ['QC Failed', 'Rejected'].includes(h.newStatus))
          .map((h) => ({
            id: h.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            ...orderDateFields(o),
            stageLabel: STAGES.find((s) => s.key === h.stage)?.label,
            at: formatDate(h.at),
            user: h.user,
            remarks: h.remarks || '—',
          }))
      ),
    },
    {
      id: 'rework',
      title: 'Rework Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'stageLabel', label: 'Stage' },
        { key: 'at', label: 'Date' },
        { key: 'user', label: 'By' },
        { key: 'remarks', label: 'Remarks' },
      ],
      rows: orders.flatMap((o) =>
        (o.history || [])
          .filter((h) => h.newStatus === 'Rework Required')
          .map((h) => ({
            id: h.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            ...orderDateFields(o),
            stageLabel: STAGES.find((s) => s.key === h.stage)?.label,
            at: formatDate(h.at),
            user: h.user,
            remarks: h.remarks || '—',
          }))
      ),
    },
    {
      id: 'packing-report',
      title: 'Packing Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'tagNo', label: 'Tag #' },
        { key: 'invoiceNo', label: 'Invoice #' },
        { key: 'packingDateFmt', label: 'Packing Date' },
        { key: 'status', label: 'Status' },
      ],
      rows: orders
        .filter((o) => o.stages?.packing && o.stages.packing.status !== 'Pending')
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          ...orderDateFields(o),
          tagNo: o.stages?.packing?.tagNo || '—',
          invoiceNo: o.stages?.packing?.invoiceNo || '—',
          packingDateFmt: formatDate(o.stages?.packing?.completionDate || o.stages?.packing?.startDate),
          status: o.stages?.packing?.status,
        })),
    },
    {
      id: 'delivery-report',
      title: 'Delivery Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'courierTransporter', label: 'Courier / Transporter' },
        { key: 'trackingNo', label: 'Tracking #' },
        { key: 'actualFmt', label: 'Actual Date' },
        { key: 'delayDays', label: 'Delay (days)' },
        { key: 'status', label: 'Status' },
      ],
      rows: orders
        .filter((o) => o.stages?.delivery && o.stages.delivery.status !== 'Pending')
        .map((o) => {
          const d = o.stages?.delivery || {}
          const info = delayDaysFor(d, o.targetDeliveryDate)
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            ...orderDateFields(o),
            courierTransporter: d.courierTransporter || '—',
            trackingNo: d.trackingNo || '—',
            actualFmt: formatDate(d.completionDate),
            delayDays: info.delayDays,
            status: d.status,
          }
        }),
    },
    {
      id: 'order-completion',
      title: 'Order Completion Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        ...ORDER_DATE_COLUMNS,
        { key: 'closedDateFmt', label: 'Closed Date' },
        { key: 'cycleDays', label: 'Cycle Time (days)' },
        { key: 'closedBy', label: 'Closed By' },
      ],
      rows: orders
        .filter((o) => o.overallStatus === 'Closed')
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          ...orderDateFields(o),
          closedDateFmt: formatDate(o.closedDate),
          cycleDays: o.closedDate ? daysBetween(o.orderDate, o.closedDate) : '—',
          closedBy: o.closedBy || '—',
        })),
    },
    {
      id: 'employee-performance',
      title: 'Employee Performance Report',
      columns: [
        { key: 'name', label: 'Employee' },
        { key: 'stagesHandled', label: 'Stages Handled' },
        { key: 'onTime', label: 'On Time' },
        { key: 'delayed', label: 'Delayed' },
        { key: 'avgDelay', label: 'Avg Delay (days)' },
      ],
      rows: (() => {
        const map = {}
        orders.forEach((o) => {
          STAGE_KEYS.forEach((k) => {
            const rec = o.stages?.[k]
            if (!rec || !rec.assignedPerson || !TERMINAL.includes(rec.status)) return
            const info = delayDaysFor(rec)
            map[rec.assignedPerson] = map[rec.assignedPerson] || { name: rec.assignedPerson, stagesHandled: 0, onTime: 0, delayed: 0, totalDelay: 0 }
            const m = map[rec.assignedPerson]
            m.stagesHandled++
            if (info.state === 'completed-late') {
              m.delayed++
              m.totalDelay += info.delayDays
            } else {
              m.onTime++
            }
          })
        })
        return Object.values(map).map((m) => ({ ...m, id: m.name, avgDelay: m.delayed ? num(m.totalDelay / m.delayed) : 0 }))
      })(),
    },
  ]
}
