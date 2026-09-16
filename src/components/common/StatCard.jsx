import { cx } from '@/lib/utils'

export default function StatCard({ label, value, icon: Icon, tone = 'default', sub, onClick }) {
  const tones = {
    default: 'bg-white text-hos-ink-900',
    gold: 'bg-gradient-to-br from-hos-gold-500 to-hos-gold-600 text-white',
    dark: 'bg-hos-ink-900 text-white',
    danger: 'bg-red-50 text-red-700 border-red-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }
  return (
    <button
      onClick={onClick}
      className={cx(
        'card flex flex-col justify-between p-4 text-left transition-shadow hover:shadow-md',
        tones[tone],
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cx('text-xs font-semibold uppercase tracking-wide', tone === 'default' ? 'text-hos-ink-500' : 'opacity-80')}>
          {label}
        </span>
        {Icon && <Icon size={16} className="opacity-70" />}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
      {sub && <div className={cx('mt-1 text-xs', tone === 'default' ? 'text-hos-ink-400' : 'opacity-80')}>{sub}</div>}
    </button>
  )
}
