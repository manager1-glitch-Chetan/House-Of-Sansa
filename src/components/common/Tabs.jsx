import { cx } from '@/lib/utils'

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-hos-ink-200">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            'relative -mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium transition-colors',
            active === t.key
              ? 'border-hos-gold-500 text-hos-gold-700'
              : 'border-transparent text-hos-ink-500 hover:text-hos-ink-800'
          )}
        >
          {t.icon}
          {t.label}
          {t.badge != null && (
            <span className="ml-1 rounded-full bg-hos-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-hos-ink-600">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
