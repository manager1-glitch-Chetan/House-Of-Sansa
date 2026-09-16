import { Filter, X } from 'lucide-react'

/**
 * fields: [{ key, label, type: 'text'|'select'|'date', options?: [{value,label}] }]
 * value: object keyed by field key
 */
export default function FilterBar({ fields, value, onChange, onClear }) {
  const set = (key, v) => onChange({ ...value, [key]: v })
  const activeCount = Object.values(value || {}).filter((v) => v !== '' && v != null).length

  return (
    <div className="card mb-4 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">
          <Filter size={14} /> Filters {activeCount > 0 && `(${activeCount})`}
        </div>
        {fields.map((f) => (
          <div key={f.key} className="min-w-[140px]">
            <label className="label">{f.label}</label>
            {f.type === 'select' ? (
              <select className="input" value={value[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o.value ?? o} value={o.value ?? o}>
                    {o.label ?? o}
                  </option>
                ))}
              </select>
            ) : f.type === 'date' ? (
              <input type="date" className="input" value={value[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input
                type="text"
                className="input"
                placeholder={f.placeholder || f.label}
                value={value[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
        {activeCount > 0 && (
          <button className="btn-outline btn-sm mb-0.5" onClick={onClear}>
            <X size={13} /> Clear
          </button>
        )}
      </div>
    </div>
  )
}
