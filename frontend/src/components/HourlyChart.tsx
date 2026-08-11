import { WeatherData } from '../types/index.js'

interface HourlyChartProps {
  data: WeatherData | null
  loading: boolean
  hours?: number
  className?: string
}

// Wide viewBox keeps text at a sane size when the chart stretches across the screen
const W = 640
const PAD_L = 20
const PAD_R = 12
// TEMP_TOP leaves room for the label sitting above the warmest vertex
const TEMP_TOP = 22
const TEMP_BOTTOM = 64
const BASELINE = 72
const POP_BASE = 94
const POP_MAX_H = 18

function fmtHour(unix: number): string {
  const h = new Date(unix * 1000).getHours()
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

/** Temperature line + precipitation-probability bars from the hourly forecast */
export function HourlyChart({ data, loading, hours = 12, className = '' }: HourlyChartProps) {
  const points = data?.hourly.slice(0, hours) ?? []

  if (loading || points.length < 2) {
    return (
      <div
        className={`text-xs text-center py-6 ${className}`}
        style={{ color: 'var(--text-3, #888)' }}
      >
        {loading ? 'Loading hourly…' : 'Hourly forecast unavailable'}
      </div>
    )
  }

  const temps = points.map((p) => p.temp)
  let min = Math.min(...temps)
  let max = Math.max(...temps)
  if (min === max) {
    min -= 1
    max += 1
  }

  const step = (W - PAD_L - PAD_R) / (points.length - 1)
  const x = (i: number) => PAD_L + i * step
  const y = (t: number) => TEMP_TOP + (1 - (t - min) / (max - min)) * (TEMP_BOTTOM - TEMP_TOP)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.temp)}`).join(' ')
  const areaPath = `${linePath} L ${x(points.length - 1)} ${BASELINE} L ${x(0)} ${BASELINE} Z`

  // Every vertex is labelled — there is no y-axis, so an unlabelled point can't be read.
  // Labels sit above the line except at a trough, where below keeps them off the curve.
  const labelBelow = (i: number) => {
    const prev = temps[i - 1] ?? temps[i + 1] ?? temps[i]
    const next = temps[i + 1] ?? temps[i - 1] ?? temps[i]
    return temps[i] < prev && temps[i] < next
  }

  return (
    <svg viewBox={`0 0 ${W} 112`} className={`w-full ${className}`} role="img">
      <path d={areaPath} fill="var(--hourly-area, rgba(232, 168, 124, 0.15))" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--hourly-line, #e8a87c)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={p.time}>
          <circle cx={x(i)} cy={y(p.temp)} r="2.5" fill="var(--hourly-line, #e8a87c)" />
          <text
            x={x(i)}
            y={y(p.temp) + (labelBelow(i) ? 14 : -7)}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            fontSize="11"
            fill="var(--text-2, #aaa)"
          >
            {Math.round(p.temp)}°
          </text>
          {p.pop > 5 && (
            <rect
              x={x(i) - 4}
              y={POP_BASE - (p.pop / 100) * POP_MAX_H}
              width="8"
              height={(p.pop / 100) * POP_MAX_H}
              rx="1"
              fill="var(--hourly-pop, #6b8afd)"
              opacity="0.8"
            />
          )}
          {i % 2 === 0 && (
            <text
              x={x(i)}
              y="106"
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-3, #888)"
              letterSpacing="0.05em"
            >
              {fmtHour(p.time)}
            </text>
          )}
        </g>
      ))}
      <line
        x1={PAD_L}
        y1={POP_BASE}
        x2={W - PAD_R}
        y2={POP_BASE}
        stroke="var(--text-4, #555)"
        strokeWidth="0.5"
      />
    </svg>
  )
}
