import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CHART_INK, seriesColor } from '@/lib/chartTheme'

export default function SimpleBarChart({ data, color, horizontal = false, colorByIndex = false }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, left: horizontal ? 60 : 0, bottom: 4 }}>
        <CartesianGrid stroke={CHART_INK.grid} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: CHART_INK.secondary }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_INK.secondary }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} allowDecimals={false} />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          contentStyle={{ borderRadius: 8, borderColor: CHART_INK.grid, fontSize: 12 }}
        />
        <Bar dataKey="value" fill={color || seriesColor(0)} radius={[4, 4, 4, 4]} maxBarSize={28}>
          {colorByIndex && data.map((_, i) => <Cell key={i} fill={seriesColor(i)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
