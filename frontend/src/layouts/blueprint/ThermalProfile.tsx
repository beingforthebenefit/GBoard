import { useRef } from 'react'
import { TempHistory } from '../../types/index.js'
import { useElementSize } from '../../hooks/useElementSize.js'

// Fallback viewBox before the container has been measured
const FALLBACK_W = 520
const FALLBACK_H = 150
const PAD_L = 28
const PAD_R = 10
const PAD_T = 8
const PAD_B = 16

/** Round a range outward to tidy 5° gridlines */
function niceBounds(min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 10]
  if (min === max) return [min - 5, max + 5]
  const step = 5
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step]
}

/** Path string that lifts the pen across null gaps */
function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  let d = ''
  let pendown = false
  values.forEach((v, i) => {
    if (v === null) {
      pendown = false
      return
    }
    d += `${pendown ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `
    pendown = true
  })
  return d.trim()
}

function fmtHourLabel(unix: number): string {
  const h = new Date(unix * 1000).getHours()
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

interface Props {
  temps: TempHistory | null | undefined
  loading: boolean
}

/**
 * 24-hour interior vs exterior temperature, drawn as a drafting section:
 * solid line for inside, dashed for outside, hatched band for the gap between.
 */
export function ThermalProfile({ temps, loading }: Props) {
  const plotRef = useRef<HTMLDivElement>(null)
  const measured = useElementSize(plotRef)
  // Draw at true CSS pixel size so the section fills its band without letterboxing
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const W = measured ? Math.max(160, measured.width / dpr) : FALLBACK_W
  const H = measured ? Math.max(80, measured.height / dpr) : FALLBACK_H

  if (loading && !temps) {
    return (
      <div className="text-[11px] tracking-[0.15em]" style={{ color: 'var(--bp-ink3)' }}>
        PLOTTING THERMAL SECTION…
      </div>
    )
  }

  if (!temps || !temps.available || temps.points.length < 2) {
    return (
      <div
        className="text-[11px] leading-relaxed tracking-[0.08em]"
        style={{ color: 'var(--bp-ink3)' }}
      >
        NO TEMPERATURE RECORD. GBOARD LOOKS FOR HOME ASSISTANT SENSORS WITH DEVICE CLASS
        “TEMPERATURE”; NAME THEM INDOOR/OUTDOOR OR PIN THEM WITH HOMEASSISTANT_INDOOR_TEMP_ENTITY
        AND HOMEASSISTANT_OUTDOOR_TEMP_ENTITY.
      </div>
    )
  }

  const pts = temps.points
  const indoor = pts.map((p) => p.indoor)
  const outdoor = pts.map((p) => p.outdoor)
  const finite = [...indoor, ...outdoor].filter((v): v is number => v !== null)
  const [lo, hi] = niceBounds(Math.min(...finite), Math.max(...finite))

  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const x = (i: number) => PAD_L + (i / (pts.length - 1)) * plotW
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * plotH

  // Both series are forward-filled, so once both have readings they never gap again:
  // the overlap is a suffix, and the envelope is one closed polygon over it.
  const bothFrom = pts.findIndex((p) => p.indoor !== null && p.outdoor !== null)
  let bandPath = ''
  if (bothFrom >= 0) {
    const top = pts
      .slice(bothFrom)
      .map(
        (p, n) => `${n === 0 ? 'M' : 'L'} ${x(bothFrom + n).toFixed(1)} ${y(p.indoor!).toFixed(1)}`
      )
    const bottom = pts
      .slice(bothFrom)
      .map((p, n) => ({ p, i: bothFrom + n }))
      .reverse()
      .map(({ p, i }) => `L ${x(i).toFixed(1)} ${y(p.outdoor!).toFixed(1)}`)
    bandPath = `${top.join(' ')} ${bottom.join(' ')} Z`
  }

  // Fewer gridlines when the band is short, or the labels collide
  const steps = plotH < 90 ? 2 : plotH < 150 ? 3 : 4
  const gridTemps = Array.from(
    new Set(Array.from({ length: steps + 1 }, (_, i) => Math.round(lo + ((hi - lo) * i) / steps)))
  )

  const tickIdxs = [0, Math.floor(pts.length / 4), Math.floor(pts.length / 2), pts.length - 1]
  const delta =
    temps.indoorNow !== null && temps.outdoorNow !== null
      ? Math.round(temps.indoorNow - temps.outdoorNow)
      : null

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Legend */}
      <div
        className="flex items-baseline justify-between gap-3 text-[9px] tracking-[0.18em] flex-shrink-0"
        style={{ color: 'var(--bp-ink3)' }}
      >
        <span className="flex items-baseline gap-3 min-w-0">
          <span className="truncate">
            <span style={{ color: 'var(--bp-bright)' }}>──</span> INTERIOR
            {temps.indoorNow !== null && (
              <span style={{ color: 'var(--bp-bright)' }}> {temps.indoorNow}°</span>
            )}
          </span>
          <span className="truncate">
            <span style={{ color: 'var(--bp-red)' }}>╌╌</span> EXTERIOR
            {temps.outdoorNow !== null && (
              <span style={{ color: 'var(--bp-red)' }}> {temps.outdoorNow}°</span>
            )}
          </span>
        </span>
        {delta !== null && (
          <span className="flex-shrink-0">
            ΔT <span style={{ color: 'var(--bp-ink)' }}>{Math.abs(delta)}°</span>
          </span>
        )}
      </div>

      <div ref={plotRef} className="flex-1 min-h-0 w-full mt-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          role="img"
          aria-label="Interior versus exterior temperature over the last 24 hours"
        >
          <defs>
            <pattern
              id="bp-thermal-hatch"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--bp-line-soft)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Temperature gridlines */}
          {gridTemps.map((t) => (
            <g key={t}>
              <line
                x1={PAD_L}
                y1={y(t)}
                x2={W - PAD_R}
                y2={y(t)}
                stroke="var(--bp-line-soft)"
                strokeWidth="0.75"
                strokeDasharray="2 3"
              />
              <text
                x={PAD_L - 4}
                y={y(t) + 3}
                textAnchor="end"
                fontSize="8"
                fill="var(--bp-ink3)"
                className="tabular-nums"
              >
                {t}°
              </text>
            </g>
          ))}

          {/* Hatched envelope between the two curves */}
          {bandPath && <path d={bandPath} fill="url(#bp-thermal-hatch)" stroke="none" />}

          {/* Exterior — dashed */}
          <path
            d={linePath(outdoor, x, y)}
            fill="none"
            stroke="var(--bp-red)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            strokeLinejoin="round"
          />
          {/* Interior — solid */}
          <path
            d={linePath(indoor, x, y)}
            fill="none"
            stroke="var(--bp-bright)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {/* Axis + time ticks */}
          <line
            x1={PAD_L}
            y1={H - PAD_B}
            x2={W - PAD_R}
            y2={H - PAD_B}
            stroke="var(--bp-line)"
            strokeWidth="1"
          />
          {tickIdxs.map((i, n) => (
            <text
              key={i}
              x={x(i)}
              y={H - PAD_B + 10}
              textAnchor={n === 0 ? 'start' : n === tickIdxs.length - 1 ? 'end' : 'middle'}
              fontSize="8"
              fill="var(--bp-ink3)"
            >
              {n === tickIdxs.length - 1 ? 'NOW' : fmtHourLabel(pts[i].t)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
