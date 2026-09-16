// Validated categorical palette (light mode) — see dataviz skill reference.
// Fixed hue order; never cycled/reassigned per-filter.
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
}

export const CHART_INK = {
  surface: '#ffffff',
  primary: '#16181d',
  secondary: '#4f5a67',
  muted: '#898781',
  grid: '#e9ebee',
  axis: '#c3c2b7',
}

export const chartMargin = { top: 8, right: 12, bottom: 4, left: 0 }

export function seriesColor(i) {
  return CATEGORICAL[i % CATEGORICAL.length]
}
