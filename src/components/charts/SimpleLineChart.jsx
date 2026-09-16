import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_INK, seriesColor } from '@/lib/chartTheme'

export default function SimpleLineChart({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_INK.secondary }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: CHART_INK.grid, fontSize: 12 }} />
        <Line type="monotone" dataKey="value" stroke={color || seriesColor(0)} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
