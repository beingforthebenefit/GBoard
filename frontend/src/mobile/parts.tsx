import { ReactNode } from 'react'
import { Status, SectionId } from './status.js'
import { Pt } from './explorerData.js'

const GLYPH: Record<Status, string> = { good: '✓', warn: '!', bad: '✕', none: '•', stale: '' }
const GLYPH_LABEL: Record<Status, string> = {
  good: 'OK',
  warn: 'Needs attention',
  bad: 'Problem',
  none: 'Information',
  stale: 'Out of date or held',
}

/** Status is never colour alone: every chip carries a glyph, and stale is a hatch */
export function Glyph({ status }: { status: Status }) {
  return (
    <span className={`gbm-g s-${status}`} role="img" aria-label={GLYPH_LABEL[status]}>
      {GLYPH[status]}
    </span>
  )
}

export function Sparkline({
  data,
  second,
  width = 120,
  height = 38,
  fill = false,
}: {
  data: Pt[]
  second?: Pt[]
  width?: number
  height?: number
  fill?: boolean // stretch to the container's width
}) {
  if (data.length < 2) {
    return (
      <span className="gbm-spark-empty" style={fill ? undefined : { width }} aria-hidden="true" />
    )
  }
  const all = [...data, ...(second ?? [])].map((p) => p[1])
  let lo = Math.min(...all)
  let hi = Math.max(...all)
  const pad = (hi - lo) * 0.15 || 1
  lo -= pad
  hi += pad
  const t0 = data[0][0]
  const t1 = data[data.length - 1][0]
  const x = (t: number) => 2 + ((t - t0) / (t1 - t0 || 1)) * (width - 6)
  const y = (v: number) => 3 + (1 - (v - lo) / (hi - lo)) * (height - 6)
  const path = (s: Pt[]) =>
    s.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('')
  const last = data[data.length - 1]
  const area = `${path(data)}L${x(last[0]).toFixed(1)} ${height}L${x(t0).toFixed(1)} ${height}Z`
  return (
    <svg
      className="gbm-spark"
      viewBox={`0 0 ${width} ${height}`}
      style={fill ? { width: '100%', height: 'auto' } : { width, height }}
      aria-hidden="true"
    >
      <path d={area} fill="var(--sec)" fillOpacity={0.16} />
      {second && second.length > 1 && (
        <path
          d={path(second)}
          fill="none"
          stroke="var(--sec)"
          strokeOpacity={0.55}
          strokeWidth={1.3}
          strokeDasharray="3 2"
        />
      )}
      <path
        d={path(data)}
        fill="none"
        stroke="var(--sec)"
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <circle cx={x(last[0])} cy={y(last[1])} r={2.8} fill="var(--sec)" />
    </svg>
  )
}

export function Meter({
  value,
  color = 'var(--sec)',
  height,
}: {
  value: number
  color?: string
  height?: number
}) {
  return (
    <span className="gbm-meter" style={height ? { height } : undefined}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </span>
  )
}

export function Section({
  id,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: SectionId
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className={`gbm-sec c-${id}`} id={`sec-${id}`} data-open={open}>
      <button
        className="gbm-sec-head"
        aria-expanded={open}
        aria-controls={`body-${id}`}
        onClick={onToggle}
      >
        <h2>{title}</h2>
        <span className="gbm-sum">{summary}</span>
        <svg
          className="gbm-chev"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="gbm-sec-body" id={`body-${id}`}>
        <div className="gbm-inner">
          <div className="gbm-pad">{children}</div>
        </div>
      </div>
    </section>
  )
}

export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="gbm-lbl">
      <span>{children}</span>
      {right !== undefined && <span>{right}</span>}
    </div>
  )
}

export function Notice({
  status,
  title,
  children,
}: {
  status: Status
  title: string
  children?: ReactNode
}) {
  return (
    <div className={`gbm-notice s-${status}`} role="status">
      <Glyph status={status} />
      <span>
        <strong>{title}</strong>
        {children}
      </span>
    </div>
  )
}
