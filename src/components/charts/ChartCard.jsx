export default function ChartCard({ title, subtitle, children, height = 260 }) {
  return (
    <div className="card p-4">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-hos-ink-800">{title}</h3>
        {subtitle && <p className="text-xs text-hos-ink-400">{subtitle}</p>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}
