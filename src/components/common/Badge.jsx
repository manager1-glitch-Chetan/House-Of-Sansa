import { cx } from '@/lib/utils'

const TONE = {
  neutral: 'bg-hos-ink-100 text-hos-ink-700',
  gold: 'bg-hos-gold-100 text-hos-gold-800',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  dark: 'bg-hos-ink-900 text-white',
}

export default function Badge({ tone = 'neutral', children, className, dot = false }) {
  return (
    <span className={cx('badge', TONE[tone] || TONE.neutral, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

// Status → tone mapping used across the whole app for consistency.
const STATUS_TONE = {
  Pending: 'neutral',
  'Not Started': 'neutral',
  'In Progress': 'info',
  'Submitted for Review': 'info',
  'Revision Required': 'warning',
  'Rework Required': 'warning',
  Hold: 'warning',
  'QC Failed': 'danger',
  Rejected: 'danger',
  Failed: 'danger',
  Returned: 'danger',
  Completed: 'success',
  Approved: 'success',
  Packed: 'success',
  Delivered: 'success',
  Dispatched: 'info',
  'In Transit': 'info',
  'Ready for Delivery': 'gold',
  New: 'gold',
  'In Production': 'info',
  Delayed: 'danger',
  Closed: 'dark',
}

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'} className={className}>
      {status || '—'}
    </Badge>
  )
}

const DELAY_TONE = {
  'not-started': 'neutral',
  'on-time': 'success',
  'due-today': 'warning',
  delayed: 'danger',
  completed: 'gold',
  'completed-late': 'warning',
}

export function DelayBadge({ state, days, label }) {
  return (
    <Badge tone={DELAY_TONE[state] || 'neutral'}>
      {label} {days > 0 ? `(${days}d)` : ''}
    </Badge>
  )
}
