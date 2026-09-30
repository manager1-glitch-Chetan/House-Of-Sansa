import { formatDate, num, summarizeFields } from '@/lib/utils'
import { TERMINAL_STATUSES } from '@/lib/constants'
import { diamondIssueRows, gemstoneIssueRows, hasIssueValue, issueTotals, describeIssue } from './issueRows'

// ---------------------------------------------------------------------------
// Read-only recap of what a stage recorded — shown as the "Previous stage"
// card (and the "Earlier stages" list) at the top of every stage form.
// Labels match the stage forms themselves, so what someone typed reads back
// the same way.
//
// summarizeStage(stageKey, record, order) -> {
//   items:   [{ label, value }]                       label/value grid
//   lists:   [{ title, rows: [{ text, pcs, weight }], total }]
//   images:  [{ label, files }]                       thumbnails
//   remarks: string
// }
// ---------------------------------------------------------------------------

const isBlank = (v) => v === '' || v == null || (Array.isArray(v) && v.length === 0)
const n = (v) => Number(v) || 0

const date = (v) => (isBlank(v) ? '' : formatDate(v))
const number = (v, unit = '') => (isBlank(v) ? '' : `${num(v)}${unit}`)
// "78 pcs · 2.4 ct" — blank when neither was entered.
const pcsCt = (pcs, ct) => (isBlank(pcs) && isBlank(ct) ? '' : `${n(pcs)} pcs · ${num(ct)} ct`)

function build({ items = [], lists = [], images = [], remarks = [] }) {
  return {
    items: items.filter(([, value]) => !isBlank(value)).map(([label, value]) => ({ label, value: String(value) })),
    lists: lists.filter((l) => l.rows.length),
    images: images.filter(([, files]) => files?.length).map(([label, files]) => ({ label, files })),
    remarks: remarks.filter(Boolean).join(' · '),
  }
}

function issueList(title, rows) {
  const filled = rows.filter(hasIssueValue)
  return {
    title,
    rows: filled.map((r) => ({ text: describeIssue(r) || '—', pcs: n(r.pcs), weight: n(r.weight) })),
    total: filled.length > 1 ? issueTotals(filled) : null,
  }
}

const SUMMARIES = {
  // Order Received has no stage form — its "record" is the order itself.
  orderReceived: (_r, o) =>
    build({
      items: [
        ['Customer', o.customerName],
        ['Design / Item', [o.productName, o.productCode && `(${o.productCode})`].filter(Boolean).join(' ')],
        ['Pcs', o.quantity],
        ['Size', o.size],
        ['Metal', [o.gold?.type, o.gold?.purity, o.gold?.colour].filter(Boolean).join(' ')],
        ['Metal Weight (g)', n(o.gold?.estimatedWeight) ? number(o.gold.estimatedWeight) : ''],
        ['Diamond', n(o.diamond?.pcs) || n(o.diamond?.weight) ? pcsCt(o.diamond?.pcs, o.diamond?.weight) : ''],
        ['Diamond Particular', o.diamond?.particular],
        ['Expected Delivery', date(o.targetDeliveryDate)],
      ],
      images: [['Reference Image', o.referenceImage]],
      remarks: [o.customerRequirement],
    }),
  planning: (r) => build({ items: [['Decision', r.decision || r.status], ['Approved By', r.approvedBy]], remarks: [r.remarks] }),
  karigarAssign: (r) =>
    build({
      items: [
        ['Karigar Name', r.karigarName],
        ['Karigar Assign Date', date(r.startDate)],
        ['Expected Date from Karigar', date(r.targetDate)],
      ],
      remarks: [r.remarks],
    }),
  cad: (r) =>
    build({
      items: [['Designer Name', r.designerName], ['CAD Version', r.cadVersion], ['Approved By', r.approvedBy]],
      images: [['CAD Attachment', r.cadAttachment]],
      remarks: [r.remarks],
    }),
  camRpt: (r) => build({ items: [['Approved By', r.approvedBy], ['CAM / RPT Date', date(r.rptDate)], ['Machine', r.machine]], remarks: [r.remarks] }),
  gemStone: (r) =>
    build({
      items: [['Approved By', r.approvedBy]],
      lists: [issueList('Gem Stone Requirement', r.particulars || [])],
      remarks: [r.remarks],
    }),
  casting: (r) =>
    build({
      items: [
        ['Casting Date', date(r.castingDate)],
        ['Casting Weight (g)', number(r.goldWeight)],
        ['Purity', r.goldPurity && (r.purityChangeReason ? `${r.goldPurity} (changed: ${r.purityChangeReason})` : r.goldPurity)],
        ['Gold Colour', r.goldColour],
        ['Size of Article', r.sizeOfArticle],
        ['Planned Pcs', r.plannedPcs],
        ['Casted Pcs', r.castedPcs],
        ['Rejected Pcs', r.rejectedPcs],
        ['Good Pcs', isBlank(r.castedPcs) ? '' : Math.max(0, n(r.castedPcs) - n(r.rejectedPcs))],
      ],
      images: [['Attachments', r.attachments]],
      remarks: [r.remarks],
    }),
  filling: (r) =>
    build({
      items: [
        ['Approved By', r.approvedBy],
        ['Filling Type', r.fillingType],
        ['Weight Before (g)', number(r.weightBeforeFilling)],
        ['Weight After (g)', number(r.weightAfterFilling)],
      ],
      remarks: [r.remarks],
    }),
  diamondSetting: (r) => {
    const diamonds = diamondIssueRows(r)
    const gems = gemstoneIssueRows(r)
    return build({
      lists: [issueList('Diamonds Issued', diamonds), issueList('Gem Stones Issued', gems)],
      images: [['Before Setting', [...diamonds, ...gems].flatMap((row) => row.beforeSettingImage || [])]],
      remarks: [r.issueRemarks, r.gemstoneIssueRemarks],
    })
  },
  rhodium: (r) =>
    build({
      items: [
        ['Approved By', r.approvedBy],
        ['Rhodium Date', date(r.issueDate)],
        ['Type', r.rhodiumType],
        ['Weight Before (g)', number(r.weightBefore)],
        ['Weight After (g)', number(r.weightAfter)],
      ],
      remarks: [r.remarks],
    }),
  consumption: (r) =>
    build({
      items: [
        ['Diamond Used', pcsCt(r.usedPcs, r.usedWeight)],
        ['Diamond Returned', pcsCt(r.returnedPcs, r.returnedWeight)],
        ['Diamond Broken / Lost', pcsCt(r.brokenLostPcs, r.brokenLostWeight)],
        ['Gem Stone Used', pcsCt(r.gemstoneUsedPcs, r.gemstoneUsedWeight)],
        ['Gem Stone Returned', pcsCt(r.gemstoneReturnedPcs, r.gemstoneReturnedWeight)],
        ['Gem Stone Broken / Lost', pcsCt(r.gemstoneBrokenLostPcs, r.gemstoneBrokenLostWeight)],
      ],
      images: [['After Setting', [...(r.afterSettingImage || []), ...(r.gemstoneAfterSettingImage || [])]]],
      remarks: [r.consumptionRemarks, r.gemstoneConsumptionRemarks],
    }),
  finalQc: (r) => {
    const checked = (r.checklist || []).filter((c) => c.result && c.result !== 'NA')
    const passed = checked.filter((c) => c.result === 'Pass').length
    return build({
      items: [
        ['Final Pcs', r.finalPcs],
        ['Final Gold Weight (g)', number(r.finalGoldWeight)],
        ['Final Diamond Pcs', r.finalDiamondPcs],
        ['Final Diamond Weight (ct)', number(r.finalDiamondWeight)],
        ['Final Gem Stone Pcs', r.finalGemstonePcs],
        ['Final Gem Stone Weight (ct)', number(r.finalGemstoneWeight)],
        ['Checklist', checked.length ? `${passed} / ${checked.length} Pass` : ''],
      ],
      images: [['QC Images', r.qcImages]],
      remarks: [r.remarks],
    })
  },
  packing: (r) =>
    build({
      items: [
        ['Tag No.', r.tagNo],
        ['HUID No.', r.huidNo],
        ['Certificate No.', r.certificateNo],
        ['Code No.', r.codeNo],
        ['Invoice No.', r.invoiceNo],
        ['Pcs', r.pcs],
        ['Final Gold Weight (g)', number(r.finalGoldWeight)],
        ['Final Diamond Weight (ct)', number(r.finalDiamondWeight)],
      ],
      images: [['Packing Documents', r.packingDocs]],
      remarks: [r.remarks],
    }),
  delivery: (r) =>
    build({
      items: [
        ['Dispatch Date', date(r.dispatchDate)],
        ['Courier / Transporter', r.courierTransporter],
        ['Tracking No.', r.trackingNo],
        ['Invoice No.', r.invoiceNo],
        ['Pcs', r.pcs],
      ],
      images: [['POD', r.pod]],
      remarks: [r.remarks],
    }),
}

export function summarizeStage(stageKey, record = {}, order = {}) {
  const fn = SUMMARIES[stageKey]
  if (fn) return fn(record, order)
  // A stage without its own layout still reads back as a plain field list.
  return { items: summarizeFields(record), lists: [], images: [], remarks: record.remarks || '' }
}

export const isEmptySummary = (s) => !s.items.length && !s.lists.length && !s.images.length && !s.remarks

// Who / when for a stage's card header. Order Received has no stage form;
// its "who / when" is the sales person and the order date.
export function stageMeta(order, key) {
  const record = order.stages?.[key] || {}
  const done = TERMINAL_STATUSES.includes(record.status)
  const person = key === 'orderReceived' ? order.salesPerson || record.assignedPerson : record.assignedPerson || record.approvedBy
  const when = key === 'orderReceived' ? order.orderDate : record.completionDate
  return { record, done, person, when: done ? when : '' }
}
