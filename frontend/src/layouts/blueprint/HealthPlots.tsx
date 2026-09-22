import { ReactNode, useRef } from 'react'
import { BpTrend, SleepTrend, WeightTrend } from '../../types/index.js'
import { useElementSize } from '../../hooks/useElementSize.js'

// Fallback viewBox before the container has been measured
const FALLBACK_W = 320
const FALLBACK_H = 96
const PAD_L = 24
const PAD_R = 8
const PAD_T = 7
const PAD_B = 12

/** Blood-pressure targets, drawn as dashed reference lines rather than a green zone */
const SYS_TARGET = 120
const DIA_TARGET = 80
const SLEEP_TARGET = 8

const DAY_MS = 86_400_000

function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T12:00:00Z`) / DAY_MS)
}

/** Fractional position of `date` in a window of `days` ending on `end` (0 = oldest, 1 = today) */
function windowFraction(date: string, end: string, days: number): number {
  const offset = dayNumber(date) - dayNumber(end) + (days - 1)
  return Math.max(0, Math.min(1, offset / Math.max(1, days - 1)))
}

function niceBounds(min: number, max: number, step: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, step]
  if (min === max) return [min - step, max + step]
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step]
}

function usePlotBox(ref: React.RefObject<HTMLDivElement | null>) {
  const measured = useElementSize(ref)
  // Draw at true CSS pixel size so the plot fills its cell without letterboxing
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return {
    W: measured ? Math.max(140, measured.width / dpr) : FALLBACK_W,
    H: measured ? Math.max(56, measured.height / dpr) : FALLBACK_H,
  }
}

function Missing({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-full flex items-center text-[9px] leading-relaxed tracking-[0.15em]"
      style={{ color: 'var(--bp-ink3)' }}
    >
      {children}
    </div>
  )
}

function PlotShell({
  title,
  right,
  children,
}: {
  title: string
  right?: ReactNode
  children: ReactNode | ((W: number, H: number) => ReactNode)
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { W, H } = usePlotBox(ref)
  return (
    <div className="h-full flex flex-col min-h-0 min-w-0">
      <div
        className="flex items-baseline justify-between gap-2 text-[9px] tracking-[0.18em] flex-shrink-0"
        style={{ color: 'var(--bp-ink3)' }}
      >
        <span className="truncate">{title}</span>
        {right !== undefined && (
          <span className="flex-shrink-0 tabular-nums tracking-[0.1em]">{right}</span>
        )}
      </div>
      <div ref={ref} className="flex-1 min-h-0 w-full mt-0.5">
        {typeof children === 'function' ? (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label={title}>
            {children(W, H)}
          </svg>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function Gridline({
  y,
  W,
  label,
  emphasis = false,
}: {
  y: number
  W: number
  label: string
  emphasis?: boolean
}) {
  return (
    <g>
      <line
        x1={PAD_L}
        y1={y}
        x2={W - PAD_R}
        y2={y}
        stroke={emphasis ? 'var(--bp-line)' : 'var(--bp-line-soft)'}
        strokeWidth="0.75"
        strokeDasharray={emphasis ? '4 3' : '2 3'}
      />
      <text
        x={PAD_L - 3}
        y={y + 3}
        textAnchor="end"
        fontSize="7.5"
        fill="var(--bp-ink3)"
        className="tabular-nums"
      >
        {label}
      </text>
    </g>
  )
}

// ── Blood pressure ──

export function BpPlot({ trend, today }: { trend: BpTrend; today: string }) {
  const latest = trend.latest
  const high = latest !== null && (latest.systolic >= 130 || latest.diastolic >= 80)

  if (trend.held) {
    return (
      <PlotShell title="ARTERIAL PRESSURE · 30 D">
        <Missing>
          <span style={{ color: 'var(--bp-red)' }}>UNITS CHANGED — SERIES HELD</span>
        </Missing>
      </PlotShell>
    )
  }
  if (trend.points.length < 2) {
    return (
      <PlotShell title="ARTERIAL PRESSURE · 30 D">
        <Missing>NO READINGS LOGGED THIS PERIOD</Missing>
      </PlotShell>
    )
  }

  const values = trend.points.flatMap((p) => [p.systolic, p.diastolic])
  const [lo, hi] = niceBounds(Math.min(...values, DIA_TARGET), Math.max(...values, SYS_TARGET), 10)

  return (
    <PlotShell
      title={`ARTERIAL PRESSURE · ${trend.days} D`}
      right={
        latest ? (
          <span style={{ color: high ? 'var(--bp-red)' : 'var(--bp-bright)' }}>
            {latest.systolic}/{latest.diastolic}
          </span>
        ) : undefined
      }
    >
      {(W, H) => {
        const plotW = W - PAD_L - PAD_R
        const plotH = H - PAD_T - PAD_B
        const x = (date: string) => PAD_L + windowFraction(date, today, trend.days) * plotW
        const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * plotH
        const path = (pick: (p: (typeof trend.points)[number]) => number) =>
          trend.points
            .map(
              (p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${y(pick(p)).toFixed(1)}`
            )
            .join(' ')

        return (
          <>
            <Gridline y={y(SYS_TARGET)} W={W} label={`${SYS_TARGET}`} emphasis />
            <Gridline y={y(DIA_TARGET)} W={W} label={`${DIA_TARGET}`} emphasis />

            {/* Diastolic — dashed, the quieter of the pair */}
            <path
              d={path((p) => p.diastolic)}
              fill="none"
              stroke="var(--bp-ink2)"
              strokeWidth="1.25"
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
            {/* Systolic — solid */}
            <path
              d={path((p) => p.systolic)}
              fill="none"
              stroke="var(--bp-bright)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {trend.points.map((p) => (
              <g key={p.date}>
                <circle
                  cx={x(p.date)}
                  cy={y(p.systolic)}
                  r="1.8"
                  fill={p.systolic >= 130 ? 'var(--bp-red)' : 'var(--bp-bright)'}
                />
                <circle cx={x(p.date)} cy={y(p.diastolic)} r="1.4" fill="var(--bp-ink2)" />
              </g>
            ))}

            <line
              x1={PAD_L}
              y1={H - PAD_B}
              x2={W - PAD_R}
              y2={H - PAD_B}
              stroke="var(--bp-line)"
              strokeWidth="1"
            />
            <text
              x={W - PAD_R}
              y={H - 3}
              textAnchor="end"
              fontSize="7.5"
              fill="var(--bp-ink3)"
              className="tabular-nums"
            >
              MEAN {trend.avgSystolic}/{trend.avgDiastolic} · n={trend.points.length}
            </text>
          </>
        )
      }}
    </PlotShell>
  )
}

// ── Body mass ──

export function MassPlot({ trend, today }: { trend: WeightTrend; today: string }) {
  if (trend.held) {
    return (
      <PlotShell title="BODY MASS · 90 D">
        <Missing>
          <span style={{ color: 'var(--bp-red)' }}>UNITS CHANGED — SERIES HELD</span>
        </Missing>
      </PlotShell>
    )
  }
  if (trend.points.length < 2) {
    return (
      <PlotShell title="BODY MASS · 90 D">
        <Missing>NO READINGS LOGGED THIS PERIOD</Missing>
      </PlotShell>
    )
  }

  const values = trend.points.map((p) => p.value)
  const [lo, hi] = niceBounds(Math.min(...values), Math.max(...values), 2)
  const change = trend.change ?? 0
  const unit = trend.units.toUpperCase()

  return (
    <PlotShell
      title={`BODY MASS · ${trend.days} D`}
      right={
        <span style={{ color: 'var(--bp-bright)' }}>
          {trend.latest} {unit}
        </span>
      }
    >
      {(W, H) => {
        const plotW = W - PAD_L - PAD_R
        const plotH = H - PAD_T - PAD_B
        const x = (date: string) => PAD_L + windowFraction(date, today, trend.days) * plotW
        const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * plotH
        const d = trend.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`)
          .join(' ')

        return (
          <>
            <Gridline y={y(hi)} W={W} label={`${hi}`} />
            <Gridline y={y(lo)} W={W} label={`${lo}`} />

            <path
              d={d}
              fill="none"
              stroke="var(--bp-bright)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {trend.points.map((p) => (
              <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r="1.4" fill="var(--bp-ink2)" />
            ))}

            <line
              x1={PAD_L}
              y1={H - PAD_B}
              x2={W - PAD_R}
              y2={H - PAD_B}
              stroke="var(--bp-line)"
              strokeWidth="1"
            />
            <text
              x={W - PAD_R}
              y={H - 3}
              textAnchor="end"
              fontSize="7.5"
              fill={change > 0 ? 'var(--bp-red)' : 'var(--bp-ink2)'}
              className="tabular-nums"
            >
              Δ {change > 0 ? '+' : ''}
              {change} {unit}
            </text>
          </>
        )
      }}
    </PlotShell>
  )
}

// ── Sleep ──

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function weekdayInitial(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  return WEEKDAY[d.getUTCDay()] ?? ''
}

/** The seven calendar dates ending today, oldest first */
function lastSevenDays(today: string): string[] {
  const end = Date.parse(`${today}T12:00:00Z`)
  if (Number.isNaN(end)) return []
  return Array.from({ length: 7 }, (_, i) =>
    new Date(end - (6 - i) * DAY_MS).toISOString().slice(0, 10)
  )
}

export function SleepPlot({ trend, today }: { trend: SleepTrend; today: string }) {
  if (trend.nights.length === 0) {
    return (
      <PlotShell title="SLEEP · 7 N">
        <Missing>NO SLEEP RECORD — WEAR THE WATCH OVERNIGHT</Missing>
      </PlotShell>
    )
  }

  const byDate = new Map(trend.nights.map((n) => [n.date, n]))
  const slots = lastSevenDays(today)
  const maxHours = Math.max(SLEEP_TARGET, ...trend.nights.map((n) => n.hours))

  return (
    <PlotShell
      title="SLEEP · 7 N"
      right={
        <span style={{ color: 'var(--bp-bright)' }}>
          SCORE {trend.score} · {trend.avgHours} H AVG
        </span>
      }
    >
      {(W, H) => {
        const plotW = W - PAD_L - PAD_R
        const plotH = H - PAD_T - PAD_B
        const slotW = plotW / slots.length
        const barW = Math.min(18, slotW * 0.55)
        const y = (h: number) => PAD_T + (1 - h / maxHours) * plotH
        const base = H - PAD_B

        return (
          <>
            <Gridline y={y(SLEEP_TARGET)} W={W} label={`${SLEEP_TARGET}H`} emphasis />

            {slots.map((date, i) => {
              const night = byDate.get(date)
              const cx = PAD_L + slotW * (i + 0.5)
              const left = cx - barW / 2
              // Deep and REM are what the night is judged on, so they carry the ink;
              // core fills the rest of the bar in the faintest tier
              const segments = night
                ? [
                    { h: night.deep, fill: 'var(--bp-bright)' },
                    { h: night.rem, fill: 'var(--bp-ink2)' },
                    {
                      h: Math.max(0, night.hours - night.deep - night.rem),
                      fill: 'var(--bp-line-soft)',
                    },
                  ]
                : []
              let cursor = 0

              return (
                <g key={date}>
                  {night ? (
                    segments.map((seg, n) => {
                      const top = base - ((cursor + seg.h) / maxHours) * plotH
                      const height = (seg.h / maxHours) * plotH
                      cursor += seg.h
                      return height > 0.3 ? (
                        <rect
                          key={n}
                          x={left}
                          y={top}
                          width={barW}
                          height={height}
                          fill={seg.fill}
                          stroke="var(--bp-line-soft)"
                          strokeWidth="0.5"
                        />
                      ) : null
                    })
                  ) : (
                    <line
                      x1={left}
                      y1={base}
                      x2={left + barW}
                      y2={base}
                      stroke="var(--bp-line-soft)"
                      strokeWidth="1"
                    />
                  )}
                  <text
                    x={cx}
                    y={H - 3}
                    textAnchor="middle"
                    fontSize="7.5"
                    fill={date === today ? 'var(--bp-ink)' : 'var(--bp-ink3)'}
                  >
                    {weekdayInitial(date)}
                  </text>
                </g>
              )
            })}

            <line
              x1={PAD_L}
              y1={base}
              x2={W - PAD_R}
              y2={base}
              stroke="var(--bp-line)"
              strokeWidth="1"
            />
          </>
        )
      }}
    </PlotShell>
  )
}
