import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { seriesColor, CHART_INK } from '@/lib/chartTheme'

export default function SimplePieChart({ data, donut = true }) {
  const hasData = data.some((d) => d.value > 0)
  if (!hasData) {
    return <div className="flex h-full items-center justify-center text-sm text-hos-ink-400">No data yet</div>
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={donut ? 50 : 0}
          outerRadius={80}
          paddingAngle={2}
          stroke={CHART_INK.surface}
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={seriesColor(i)} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: CHART_INK.grid, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: CHART_INK.secondary }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}
