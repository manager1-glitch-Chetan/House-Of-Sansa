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
    out.push({ label: titleCase(key), value: DATE_FIELD_KEYS.has(key) ? formatDate(value) : String(value) })
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
