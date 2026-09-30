import { TERMINAL_STATUSES } from './constants'

// ---------------------------------------------------------------------------
// IDs & formatting
// ---------------------------------------------------------------------------
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function cx(...args) {
  return args.filter(Boolean).join(' ')
}

// camelCase field key -> "Title Case" label, e.g. goldIssuedWeight -> "Gold Issued Weight"
export function titleCase(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

// Internal/complex keys that don't make sense as a flat "Label: value" chip
// in a history/audit view — they're either already shown elsewhere (status,
// remarks) or are nested structures (checklist, revisions, attachments).
const FIELD_SNAPSHOT_SKIP = new Set([
  'status',
  'remarks',
  'history',
  '_correctionReason',
  'assignedPerson',
  'department',
  'delayDays',
  'delayState',
  'createdBy',
  'approvedBy',
  'approvalDate',
])

// Date-valued keys get formatted as dates rather than shown as raw ISO
// strings — Start Date / Target Date / Completion Date are always part of
// the history snapshot per the business rule that every stage change must
// show when it was scheduled to start, due, and actually finished.
const DATE_FIELD_KEYS = new Set(['startDate', 'targetDate', 'completionDate', 'orderDate', 'dispatchDate', 'rptDate', 'issueDate', 'targetDeliveryDate'])

// Stage-specific names where the bare field key would be ambiguous in
// history ("Rpt Date", "Issue Date") — match the labels on the stage forms.
const FIELD_LABELS = { rptDate: 'CAM / RPT Date', issueDate: 'Rhodium Date', goldWeight: 'Casting Weight' }

// Reduces an arbitrary stage patch object down to a flat, display-ready list
// of { label, value } pairs — used to show "what was actually filled in" on
// history/audit entries, without dumping raw JSON at the user.
export function summarizeFields(obj) {
  if (!obj || typeof obj !== 'object') return []
  const out = []
  for (const [key, value] of Object.entries(obj)) {
    if (FIELD_SNAPSHOT_SKIP.has(key)) continue
    if (value === '' || value == null) continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      out.push({ label: titleCase(key), value: `${value.length} item${value.length === 1 ? '' : 's'}` })
      continue
    }
    if (typeof value === 'object') continue // nested objects (rare) — skip rather than dump
    out.push({ label: FIELD_LABELS[key] || titleCase(key), value: DATE_FIELD_KEYS.has(key) ? formatDate(value) : String(value) })
  }
  return out
}

export function formatDate(value, opts) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', opts || { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDate(d)} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function num(v, digits = 2) {
  const n = Number(v)
  if (Number.isNaN(n)) return '0'
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

// ---------------------------------------------------------------------------
// Delay engine — the single source of truth used everywhere in the app.
// ---------------------------------------------------------------------------
export function daysBetween(a, b) {
  const d1 = new Date(a)
  const d2 = new Date(b)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

/**
 * Returns { delayDays, state } where state is one of:
 * 'not-started' | 'on-time' | 'due-today' | 'delayed' | 'completed' | 'completed-late'
 */
export function computeDelay({ targetDate, completionDate, status, isTerminal }) {
  const done = isTerminal ?? (status ? TERMINAL_STATUSES.includes(status) : false)
  if (!targetDate) return { delayDays: 0, state: done ? 'completed' : 'not-started' }

  if (done && completionDate) {
    const diff = daysBetween(targetDate, completionDate)
    if (diff <= 0) return { delayDays: 0, state: 'completed' }
    return { delayDays: diff, state: 'completed-late' }
  }
  if (done) return { delayDays: 0, state: 'completed' }

  const today = todayISO()
  const diff = daysBetween(targetDate, today)
  if (diff > 0) return { delayDays: diff, state: 'delayed' }
  if (diff === 0) return { delayDays: 0, state: 'due-today' }
  return { delayDays: 0, state: 'on-time' }
}

export const DELAY_STATE_META = {
  'not-started': { label: 'Not Started', color: 'bg-hos-ink-100 text-hos-ink-600' },
  'on-time': { label: 'On Time', color: 'bg-emerald-100 text-emerald-700' },
  'due-today': { label: 'Due Today', color: 'bg-amber-100 text-amber-700' },
  delayed: { label: 'Delayed', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-hos-gold-100 text-hos-gold-700' },
  'completed-late': { label: 'Completed Late', color: 'bg-orange-100 text-orange-700' },
}

// ---------------------------------------------------------------------------
// Consumption rule, for diamonds and gem stones alike: more can't come back
// than was issued at Additional Issue — Returned PCS / Weight are each
// capped at the issued total. (Used and Broken / Lost aren't checked.)
// Shared by the Consumption form (inline errors) and Orders.updateStage (hard
// stop), so both enforce exactly the same limit.
//
// `rec` carries the issued totals (issuedPcs / issuedWeight,
// gemstoneIssuedPcs / gemstoneIssuedWeight) plus the consumption fields.
// Returns error messages keyed by the field they belong under:
//   returnedPcs, returnedWeight, gemstoneReturnedPcs, gemstoneReturnedWeight
// ---------------------------------------------------------------------------
const CONSUMPTION_MATERIALS = [
  { name: 'diamond', prefix: '' },
  { name: 'gem stone', prefix: 'gemstone' },
]

export function consumptionErrors(rec) {
  const errors = {}
  const v = (key) => Number(rec?.[key]) || 0
  CONSUMPTION_MATERIALS.forEach(({ name, prefix }) => {
    const k = (field) => (prefix ? `${prefix}${field}` : field.charAt(0).toLowerCase() + field.slice(1))
    const issuedPcs = v(k('IssuedPcs'))
    const issuedWeight = v(k('IssuedWeight'))
    const returnedPcs = v(k('ReturnedPcs'))
    const returnedWeight = v(k('ReturnedWeight'))
    if (returnedPcs > issuedPcs) errors[k('ReturnedPcs')] = `Returned PCS (${returnedPcs}) cannot be more than issued ${name} PCS (${issuedPcs}).`
    // Small tolerance so 0.1 + 0.2 style float sums don't trip the weight check.
    if (returnedWeight > issuedWeight + 1e-9) errors[k('ReturnedWeight')] = `Returned Weight (${returnedWeight} ct) cannot be more than issued ${name} weight (${issuedWeight} ct).`
  })
  return errors
}

/**
 * Starting values for the Final QC form — the most accurate figure recorded
 * so far for each, with the stage it came from (shown as a chip by the label):
 *   Final Pcs            Casting good pcs → order Pcs
 *   Final Gold Weight    Rhodium weight after → Filling weight after → Casting Weight → order estimate
 *   Final Diamond        Consumption used → order planned diamond
 *   Final Gem Stone      Consumption used → Gem Stone stage requirement
 * Returns { finalPcs: { value, source }, finalGoldWeight: …, finalDiamondPcs: …,
 * finalDiamondWeight: …, finalGemstonePcs: …, finalGemstoneWeight: … };
 * `value` is '' when nothing has been recorded anywhere.
 */
export function finalQcDefaults(order = {}) {
  const st = order.stages || {}
  const casting = st.casting || {}
  const cons = st.consumption || {}
  const recorded = (v) => v !== '' && v != null
  const pick = (...options) => {
    const hit = options.find(([value]) => recorded(value))
    return hit ? { value: hit[0], source: hit[1] } : { value: '', source: '' }
  }
  const goodPcs = recorded(casting.castedPcs) ? Math.max(0, (Number(casting.castedPcs) || 0) - (Number(casting.rejectedPcs) || 0)) : ''
  const gemReq = st.gemStone?.particulars || []
  const gemReqTotal = (key) => (gemReq.length ? Math.round(gemReq.reduce((sum, p) => sum + (Number(p[key]) || 0), 0) * 1000) / 1000 : '')
  const positive = (v) => (Number(v) > 0 ? v : '')
  return {
    finalPcs: pick([goodPcs, 'Casting'], [order.quantity, 'Order']),
    finalGoldWeight: pick(
      [positive(st.rhodium?.weightAfter), 'Rhodium'],
      [positive(st.filling?.weightAfterFilling), 'Filling'],
      [positive(casting.goldWeight), 'Casting'],
      [positive(order.gold?.estimatedWeight), 'Order (est.)']
    ),
    finalDiamondPcs: pick([cons.usedPcs, 'Consumption'], [positive(order.diamond?.pcs), 'Order']),
    finalDiamondWeight: pick([cons.usedWeight, 'Consumption'], [positive(order.diamond?.weight), 'Order']),
    finalGemstonePcs: pick([cons.gemstoneUsedPcs, 'Consumption'], [gemReqTotal('pcs'), 'Gem Stone req.']),
    finalGemstoneWeight: pick([cons.gemstoneUsedWeight, 'Consumption'], [gemReqTotal('weight'), 'Gem Stone req.']),
  }
}

/**
 * Delay for an order at one stage. Most stages never get their own target
 * date (only Karigar Assign sets one), so fall back to the order's Expected
 * Delivery Date — otherwise every queue would just read "Not Started".
 */
export function stageDelayFor(order, stageKey) {
  const rec = order?.stages?.[stageKey] || {}
  return computeDelay({
    targetDate: rec.targetDate || order?.targetDeliveryDate,
    completionDate: rec.completionDate,
    status: rec.status,
    isTerminal: TERMINAL_STATUSES.includes(rec.status),
  })
}

// Plain-text delay ("Delayed (3d)") for exports/search, which read raw
// row values rather than the rendered <DelayBadge>.
export function delayText(info) {
  const label = DELAY_STATE_META[info?.state]?.label || '—'
  return info?.delayDays > 0 ? `${label} (${info.delayDays}d)` : label
}

// ---------------------------------------------------------------------------
// Order date columns — shared by every order table (stage queues, order
// list, reports) so Order Date / Expected Delivery read the same everywhere.
// Raw ISO dates ride along as sort keys: formatted strings sort
// alphabetically ("01 Oct" before "25 Sep"), ISO strings sort by date.
// ---------------------------------------------------------------------------
export function orderDateFields(o) {
  return {
    orderDate: o.orderDate || '',
    orderDateFmt: formatDate(o.orderDate),
    targetDeliveryDate: o.targetDeliveryDate || '',
    targetDeliveryDateFmt: formatDate(o.targetDeliveryDate),
  }
}

export const ORDER_DATE_COLUMNS = [
  { key: 'orderDateFmt', label: 'Order Date', sortKey: 'orderDate' },
  { key: 'targetDeliveryDateFmt', label: 'Expected Delivery', sortKey: 'targetDeliveryDate' },
]

// ---------------------------------------------------------------------------
// File helpers — files are stored as data URLs in the local data layer so
// attachments survive reloads without needing a real object storage backend.
// ---------------------------------------------------------------------------
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function filesToAttachments(fileList) {
  const files = Array.from(fileList || [])
  const out = []
  for (const file of files) {
    const dataUrl = await readFileAsDataURL(file)
    out.push({
      id: uid('att'),
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      uploadedAt: new Date().toISOString(),
    })
  }
  return out
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
