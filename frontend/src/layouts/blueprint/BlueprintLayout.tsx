import { useEffect, useMemo, useRef, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { useIsDark } from '../../hooks/useIsDark.js'
import { useElementSize } from '../../hooks/useElementSize.js'
import { useSoberCounter } from '../../hooks/useSoberCounter.js'
import { buildThumborUrl } from '../../utils/thumbor.js'
import { HourlyChart } from '../../components/HourlyChart.js'
import { RadarTiles } from '../../components/RadarTiles.js'
import { WordOfDayWidget } from '../../components/WordOfDay.js'
import { SystemsSchedule } from './SystemsSchedule.js'
import { ThermalProfile } from './ThermalProfile.js'
import { LayoutProps, shouldShowRadar } from '../index.js'
import { CalendarEvent } from '../../types/index.js'

// ── Ink palettes: cyanotype print at night, blue ink on vellum by day ──

const NIGHT_VARS = {
  '--bp-paper': '#0d2440',
  '--bp-panel': 'rgba(208, 228, 247, 0.03)',
  '--bp-ink': '#c9ddf0',
  '--bp-ink2': 'rgba(201, 221, 240, 0.72)',
  '--bp-ink3': 'rgba(201, 221, 240, 0.48)',
  '--bp-line': 'rgba(201, 221, 240, 0.4)',
  '--bp-line-soft': 'rgba(201, 221, 240, 0.16)',
  '--bp-bright': '#ffffff',
  '--bp-red': '#ff7d5e',
  '--bp-grid-minor': 'rgba(201, 221, 240, 0.045)',
  '--bp-grid-major': 'rgba(201, 221, 240, 0.09)',
  // Contracts for shared widgets (HourlyChart)
  '--hourly-line': '#ffffff',
  '--hourly-area': 'rgba(201, 221, 240, 0.1)',
  '--hourly-pop': '#ff7d5e',
  '--text-2': 'rgba(201, 221, 240, 0.72)',
  '--text-3': 'rgba(201, 221, 240, 0.48)',
  '--text-4': 'rgba(201, 221, 240, 0.3)',
} as React.CSSProperties

const DAY_VARS = {
  '--bp-paper': '#f0efe8',
  '--bp-panel': 'rgba(30, 78, 126, 0.025)',
  '--bp-ink': '#1e4e7e',
  '--bp-ink2': 'rgba(30, 78, 126, 0.78)',
  '--bp-ink3': 'rgba(30, 78, 126, 0.55)',
  '--bp-line': 'rgba(30, 78, 126, 0.45)',
  '--bp-line-soft': 'rgba(30, 78, 126, 0.18)',
  '--bp-bright': '#122f4e',
  '--bp-red': '#c2451e',
  '--bp-grid-minor': 'rgba(30, 78, 126, 0.05)',
  '--bp-grid-major': 'rgba(30, 78, 126, 0.1)',
  '--hourly-line': '#122f4e',
  '--hourly-area': 'rgba(30, 78, 126, 0.1)',
  '--hourly-pop': '#c2451e',
  '--text-2': 'rgba(30, 78, 126, 0.78)',
  '--text-3': 'rgba(30, 78, 126, 0.55)',
  '--text-4': 'rgba(30, 78, 126, 0.35)',
} as React.CSSProperties

const GRID_BG =
  'linear-gradient(var(--bp-grid-major) 1px, transparent 1px), ' +
  'linear-gradient(90deg, var(--bp-grid-major) 1px, transparent 1px), ' +
  'linear-gradient(var(--bp-grid-minor) 1px, transparent 1px), ' +
  'linear-gradient(90deg, var(--bp-grid-minor) 1px, transparent 1px)'

// METAR-style condition codes keep the sheet monochrome (no weather icons)
function conditionCode(icon: string): string {
  const code = icon.slice(0, 2)
  switch (code) {
    case '01':
      return 'CLR'
    case '02':
      return 'FEW'
    case '03':
      return 'SCT'
    case '04':
      return 'OVC'
    case '09':
      return 'SHRA'
    case '10':
      return 'RA'
    case '11':
      return 'TS'
    case '13':
      return 'SN'
    case '50':
      return 'FG'
    default:
      return '—'
  }
}

function fmtClockTime(unix: number): string {
  const d = new Date(unix * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Sheet chrome ──

function Panel({
  num,
  title,
  right,
  children,
  className = '',
  bodyClassName = '',
}: {
  num: number
  title: string
  right?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  const bodyPad = bodyClassName || 'px-2.5 py-2'
  return (
    <section
      className={`border flex flex-col min-h-0 min-w-0 ${className}`}
      style={{ borderColor: 'var(--bp-line)', background: 'var(--bp-panel)' }}
    >
      <header
        className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5 flex-shrink-0"
        style={{ borderColor: 'var(--bp-line-soft)' }}
      >
        <span
          className="flex items-center gap-1.5 text-[10px] tracking-[0.22em]"
          style={{ color: 'var(--bp-ink2)' }}
        >
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[9px] tracking-normal flex-shrink-0"
            style={{ borderColor: 'var(--bp-ink2)' }}
          >
            {num}
          </span>
          {title}
        </span>
        {right && (
          <span
            className="text-[9px] tracking-[0.18em] truncate"
            style={{ color: 'var(--bp-ink3)' }}
          >
            {right}
          </span>
        )}
      </header>
      <div className={`flex-1 min-h-0 ${bodyPad}`}>{children}</div>
    </section>
  )
}

/** Progress drawn as a drafting dimension line */
function DimensionBar({ pct }: { pct: number }) {
  const W = 72
  const x = Math.max(2, Math.min(W - 2, (pct / 100) * W))
  return (
    <svg width={W} height={10} className="inline-block align-middle mx-1" aria-hidden>
      <line x1="0" y1="5" x2={W} y2="5" stroke="var(--bp-line)" strokeWidth="1" />
      <line x1="0.5" y1="1" x2="0.5" y2="9" stroke="var(--bp-line)" strokeWidth="1" />
      <line x1={W - 0.5} y1="1" x2={W - 0.5} y2="9" stroke="var(--bp-line)" strokeWidth="1" />
      <line x1="0" y1="5" x2={x} y2="5" stroke="var(--bp-red)" strokeWidth="2" />
      <line x1={x} y1="1" x2={x} y2="9" stroke="var(--bp-red)" strokeWidth="1.5" />
    </svg>
  )
}

function NorthArrow() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden className="flex-shrink-0">
      <circle cx="17" cy="17" r="15" fill="none" stroke="var(--bp-line)" strokeWidth="1" />
      <path d="M17 5 L21 21 L17 17.5 L13 21 Z" fill="var(--bp-ink2)" />
      <text
        x="17"
        y="30"
        textAnchor="middle"
        fontSize="7"
        fill="var(--bp-ink3)"
        style={{ letterSpacing: '0.1em' }}
      >
        N
      </text>
    </svg>
  )
}

// ── Header band ──

function Masthead() {
  const now = useClock()
  const h = now.getHours()
  const timeStr = `${h % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`
  const dateStr = now
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase()

  return (
    <div
      className="flex items-end justify-between border-b-2 pb-2.5 flex-shrink-0"
      style={{ borderColor: 'var(--bp-line)' }}
    >
      <div className="flex items-center gap-4">
        <NorthArrow />
        <div>
          <div
            className="text-2xl tracking-[0.35em] uppercase leading-none"
            style={{ color: 'var(--bp-bright)' }}
          >
            Todd Residence
          </div>
          <div className="text-[10px] tracking-[0.3em] mt-1.5" style={{ color: 'var(--bp-ink3)' }}>
            GENERAL ARRANGEMENT · DWG NO. GB-{new Date().getFullYear()} · ISSUED FOR OPERATION
          </div>
        </div>
      </div>
      <div className="text-right">
        <div
          className="text-5xl tabular-nums leading-none tracking-tight"
          style={{ color: 'var(--bp-bright)' }}
        >
          {timeStr}
          <span className="text-lg ml-1.5" style={{ color: 'var(--bp-ink3)' }}>
            {h >= 12 ? 'PM' : 'AM'}
          </span>
        </div>
        <div className="text-[10px] tracking-[0.25em] mt-1.5" style={{ color: 'var(--bp-ink2)' }}>
          {dateStr}
        </div>
      </div>
    </div>
  )
}

// ── Weather: atmospheric conditions panel ──

function Atmospherics({
  weatherData,
  weatherLoading,
}: Pick<LayoutProps, 'weatherData' | 'weatherLoading'>) {
  if (!weatherData) {
    return (
      <div className="text-[11px] tracking-[0.15em]" style={{ color: 'var(--bp-ink3)' }}>
        {weatherLoading ? 'SURVEYING…' : 'ATMOSPHERIC DATA UNAVAILABLE'}
      </div>
    )
  }
  const c = weatherData.current
  // Abbreviated labels: at half sheet width the full words push the values onto a
  // second line, which reads as a wrapping bug rather than a spec table
  const specs: [string, string][] = [
    ['WIND', `${c.windSpeed} ${c.windDirection}${c.windGust ? ` G${c.windGust}` : ''}`],
    ['RH', `${c.humidity}%`],
    ['VIS', `${c.visibility} MI`],
    ['BARO', `${c.pressure}`],
    ['DEW', `${c.dewPoint}°`],
  ]

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-start justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span
              className="text-6xl leading-none tabular-nums"
              style={{ color: 'var(--bp-bright)' }}
            >
              {c.temp}°
            </span>
            <span
              className="text-sm tracking-[0.2em] uppercase truncate"
              style={{ color: 'var(--bp-ink2)' }}
            >
              {c.description}
            </span>
          </div>
          <div
            className="text-[10px] tracking-[0.15em] mt-2 whitespace-nowrap"
            style={{ color: 'var(--bp-ink3)' }}
          >
            FEELS {c.feelsLike}° · SUN {fmtClockTime(c.sunrise)}—{fmtClockTime(c.sunset)}
          </div>
        </div>
        <div className="text-[10px] leading-[1.7] tracking-[0.1em] tabular-nums flex-shrink-0">
          {specs.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 whitespace-nowrap">
              <span style={{ color: 'var(--bp-ink3)' }}>{k}</span>
              <span style={{ color: 'var(--bp-ink)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full bleed: the chart keeps its own aspect, so constraining its height
          would letterbox it and leave dead margins either side. overflow-visible
          keeps the peak label from being clipped by the chart's own viewBox. */}
      <div className="w-full mt-2 mb-1 [&>svg]:overflow-visible">
        <HourlyChart data={weatherData} loading={weatherLoading} />
      </div>

      <div
        className="grid grid-cols-4 border-t pt-1.5 flex-shrink-0"
        style={{ borderColor: 'var(--bp-line-soft)' }}
      >
        {weatherData.forecast.slice(0, 4).map((day, i) => {
          const d = new Date(day.date + 'T00:00:00')
          return (
            <div
              key={day.date}
              className={`px-2 ${i > 0 ? 'border-l' : ''}`}
              style={{ borderColor: 'var(--bp-line-soft)' }}
            >
              <div className="text-[9px] tracking-[0.25em]" style={{ color: 'var(--bp-ink3)' }}>
                {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div className="text-[11px] tabular-nums mt-0.5">
                <span style={{ color: 'var(--bp-bright)' }}>{day.high}°</span>
                <span style={{ color: 'var(--bp-ink3)' }}> / {day.low}°</span>
                <span className="ml-1.5 text-[9px]" style={{ color: 'var(--bp-ink2)' }}>
                  {conditionCode(day.icon)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Calendar: schedule of works ──

function ScheduleOfWorks({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const groups = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const byDay = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const start = new Date(ev.start)
      if (start < todayStart && new Date(ev.end) < todayStart) continue
      const key = start.toDateString()
      const list = byDay.get(key) ?? []
      list.push(ev)
      byDay.set(key, list)
    }
    // Budget total lines rather than days, so a day heading never lands at the
    // bottom of the panel with its events clipped off below it
    const ordered = Array.from(byDay.entries())
      .map(([key, list]) => ({ date: new Date(key), list: list.slice(0, 5) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const out: { date: Date; list: CalendarEvent[] }[] = []
    let budget = 7
    for (const group of ordered) {
      if (budget <= 1) break // no room for a heading plus at least one event
      const list = group.list.slice(0, budget)
      out.push({ ...group, list })
      budget -= list.length + 1 // +1 for the day heading
    }
    return out
  }, [events])

  if (groups.length === 0) {
    return (
      <div className="text-[11px] tracking-[0.15em]" style={{ color: 'var(--bp-ink3)' }}>
        {loading ? 'RETRIEVING SCHEDULE…' : 'NO WORKS SCHEDULED THIS PERIOD'}
      </div>
    )
  }

  let n = 0
  const today = new Date().toDateString()
  return (
    <div className="space-y-2 overflow-hidden h-full">
      {groups.map(({ date, list }) => {
        const isToday = date.toDateString() === today
        return (
          <div key={date.toISOString()}>
            <div
              className="text-[9px] tracking-[0.25em] border-b pb-0.5 mb-1"
              style={{
                color: isToday ? 'var(--bp-red)' : 'var(--bp-ink3)',
                borderColor: 'var(--bp-line-soft)',
              }}
            >
              {isToday
                ? 'TODAY'
                : date
                    .toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'numeric',
                      day: 'numeric',
                    })
                    .toUpperCase()}
            </div>
            {list.map((ev) => {
              n += 1
              const start = new Date(ev.start)
              const time = ev.allDay
                ? 'ALL DAY'
                : `${String(start.getHours()).padStart(2, '0')}${String(start.getMinutes()).padStart(2, '0')}`
              return (
                <div key={ev.id} className="flex items-baseline gap-2 text-[11px] leading-[1.6]">
                  <span className="tabular-nums" style={{ color: 'var(--bp-ink3)' }}>
                    {String(n).padStart(2, '0')}
                  </span>
                  <span
                    className="w-12 flex-shrink-0 tabular-nums tracking-[0.08em]"
                    style={{ color: isToday ? 'var(--bp-bright)' : 'var(--bp-ink2)' }}
                  >
                    {time}
                  </span>
                  <span
                    className="truncate uppercase tracking-[0.05em]"
                    style={{ color: 'var(--bp-ink)' }}
                  >
                    {ev.title}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Site photograph (or precipitation survey when weather is active) ──

function SitePhotograph({ photos, dark }: { photos: LayoutProps['photos']; dark: boolean }) {
  // Shuffle, or every reload of the board opens on the same first photo
  const shuffled = useMemo(() => {
    const arr = [...photos]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [photos])
  const [idx, setIdx] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(frameRef)

  useEffect(() => {
    if (shuffled.length < 2) return
    const id = setInterval(() => setIdx((i) => (i + 1) % shuffled.length), 300_000)
    return () => clearInterval(id)
  }, [shuffled.length])

  const current = shuffled.length > 0 ? shuffled[idx % shuffled.length] : null
  // Request the thumbnail at the frame's real size so a big panel stays sharp
  const src =
    current && size ? buildThumborUrl(current.filename, size.width, size.height, 'cover') : null

  // Full colour, so the print sits on the sheet rather than being absorbed into it —
  // a white margin, a lifted shadow and taped corners sell it as a physical photo
  // pinned to the drawing instead of a mis-toned panel
  const tape = dark ? 'rgba(226, 238, 250, 0.22)' : 'rgba(120, 110, 84, 0.18)'

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="relative flex-1 min-h-0 flex items-stretch justify-center px-3 py-2">
        <div
          ref={frameRef}
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{
            background: dark ? '#e8eef5' : '#fdfcf8',
            padding: 4,
            boxShadow: dark
              ? '0 6px 18px rgba(0, 0, 0, 0.55)'
              : '0 6px 16px rgba(30, 78, 126, 0.28)',
            transform: 'rotate(-0.4deg)',
          }}
        >
          {src ? (
            <img src={src} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[10px] tracking-[0.2em]"
              style={{ color: '#7a8698' }}
            >
              {photos.length === 0 ? 'NO EXPOSURE ON FILE' : ''}
            </div>
          )}
        </div>

        {/* Tape over two opposite corners */}
        <span
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: -2,
            left: '9%',
            width: 96,
            height: 22,
            background: tape,
            transform: 'rotate(-5deg)',
          }}
        />
        <span
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            bottom: -2,
            right: '9%',
            width: 96,
            height: 22,
            background: tape,
            transform: 'rotate(-4deg)',
          }}
        />
      </div>
      <div
        className="text-[9px] tracking-[0.2em] pt-1 flex-shrink-0"
        style={{ color: 'var(--bp-ink3)' }}
      >
        FIG. 1 — EXISTING CONDITIONS
      </div>
    </div>
  )
}

// ── Title block ──

function Cell({ label, value, grow = false }: { label: string; value: string; grow?: boolean }) {
  return (
    <div className={`px-2 py-1 min-w-0 ${grow ? 'flex-1' : ''}`}>
      <div className="text-[8px] tracking-[0.25em]" style={{ color: 'var(--bp-ink3)' }}>
        {label}
      </div>
      <div
        className="text-[11px] tracking-[0.12em] truncate tabular-nums"
        style={{ color: 'var(--bp-ink)' }}
      >
        {value}
      </div>
    </div>
  )
}

function TitleBlock({ sobrietyDate }: { sobrietyDate: string }) {
  const now = useClock()
  const { years, months, days } = useSoberCounter(sobrietyDate)
  const totalDays = Math.max(
    0,
    Math.floor((now.getTime() - new Date(sobrietyDate).getTime()) / 86_400_000)
  )
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`

  // A real sheet's title block runs the full width of the bottom edge
  return (
    <section
      className="border-2 flex items-stretch divide-x flex-shrink-0"
      style={{ borderColor: 'var(--bp-line)', background: 'var(--bp-panel)' }}
    >
      <Cell label="PROJECT" value="TODD RESIDENCE" grow />
      <Cell label="DRAWN BY" value="GBOARD" />
      <Cell label="DATE" value={iso} />
      <Cell label="SHEET" value="A-101" />
      <Cell label="SCALE" value="N.T.S." />
      <Cell label="REV" value={`R-${totalDays}`} />
      <div className="flex items-center px-3 py-1.5 flex-shrink-0">
        <div
          className="border-2 px-3 py-1 text-center"
          style={{ borderColor: 'var(--bp-red)', transform: 'rotate(-1.5deg)' }}
        >
          <div className="text-[8px] tracking-[0.28em]" style={{ color: 'var(--bp-red)' }}>
            CERTIFIED SOBER
          </div>
          <div
            className="text-base tracking-[0.15em] tabular-nums leading-tight"
            style={{ color: 'var(--bp-red)' }}
          >
            {years}Y {months}M {days}D
          </div>
          <div className="text-[8px] tracking-[0.22em]" style={{ color: 'var(--bp-red)' }}>
            {totalDays} DAYS CONTINUOUS
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer: general conditions ──

function GeneralConditions({
  piholeData,
  sessions,
  haData,
}: Pick<LayoutProps, 'piholeData' | 'sessions' | 'haData'>) {
  return (
    <div
      className="border-t pt-1.5 flex flex-wrap items-center gap-x-6 gap-y-0.5 text-[10px] tracking-[0.15em] flex-shrink-0"
      style={{ borderColor: 'var(--bp-line)', color: 'var(--bp-ink3)' }}
    >
      <span style={{ color: 'var(--bp-ink2)' }}>GENERAL CONDITIONS:</span>
      {piholeData && (
        <span>
          DNS FILTRATION {piholeData.blockedPercentage.toFixed(1)}% ·{' '}
          {piholeData.totalQueries.toLocaleString()} REQUESTS
        </span>
      )}
      {haData?.configured && (
        <span>
          TELEMETRY LINK{' '}
          <span style={{ color: haData.reachable ? 'var(--bp-ink2)' : 'var(--bp-red)' }}>
            {haData.reachable ? 'NOMINAL' : 'DOWN'}
          </span>
        </span>
      )}
      {sessions.map((s) => {
        const pct = s.duration > 0 ? Math.round((s.viewOffset / s.duration) * 100) : 0
        return (
          <span key={`${s.title}-${s.userName}`} className="flex items-center">
            NOW SCREENING “{s.title.toUpperCase()}” · {s.userName.toUpperCase()}
            <DimensionBar pct={pct} />
            {pct}%
          </span>
        )
      })}
      {!piholeData && sessions.length === 0 && <span>ALL SYSTEMS PER SPECIFICATION</span>}
    </div>
  )
}

// ── Main layout ──

export function BlueprintLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  piholeData,
  photos,
  mediaItems,
  radarData,
  radarMode,
  sobrietyDate,
  wordOfDay,
  haData,
  haLoading,
}: LayoutProps) {
  const dark = useIsDark()
  const showRadar = shouldShowRadar(radarMode, radarData)
  const vars = dark ? NIGHT_VARS : DAY_VARS

  return (
    <div
      className="h-screen w-full overflow-hidden font-mono p-3"
      style={{
        ...vars,
        background: GRID_BG,
        backgroundSize: '96px 96px, 96px 96px, 16px 16px, 16px 16px',
        backgroundColor: dark ? '#0d2440' : '#f0efe8',
        color: 'var(--bp-ink)',
      }}
    >
      {/* Double sheet frame */}
      <div className="h-full border-2 p-1" style={{ borderColor: 'var(--bp-line)' }}>
        <div
          className="h-full border flex flex-col gap-3 px-4 pt-3 pb-2.5"
          style={{ borderColor: 'var(--bp-line-soft)' }}
        >
          <Masthead />

          {/* Portrait sheet: bands stacked down the page. Every band except the photograph
              takes its natural height, so the photograph absorbs all the slack and the sheet
              can never overflow into the title block. */}
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {/* The two charts sit side by side: each still spans its own panel, and pairing
                them buys the photograph back a few hundred pixels of height. Grid rows
                stretch, so the thermal chart matches the weather panel's natural height. */}
            <div className="flex-none grid grid-cols-2 gap-3">
              <Panel num={1} title="ATMOSPHERIC CONDITIONS" right="SCALE N.T.S.">
                <Atmospherics weatherData={weatherData} weatherLoading={weatherLoading} />
              </Panel>
              <Panel
                num={2}
                title="THERMAL SECTION · INT / EXT"
                right={`${haData?.temps?.hours ?? 24} HR`}
              >
                <ThermalProfile temps={haData?.temps} loading={haLoading} />
              </Panel>
            </div>

            <Panel
              num={3}
              title="HOUSE SYSTEMS · SCHEDULE"
              right={
                haData?.updatedAt
                  ? `SURVEYED ${new Date(haData.updatedAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : undefined
              }
              className="flex-none"
            >
              <SystemsSchedule data={haData} loading={haLoading} columns={3} />
            </Panel>

            <div className="flex-none grid grid-cols-3 gap-3">
              <Panel num={4} title="SCHEDULE OF WORKS">
                <ScheduleOfWorks events={events} loading={calendarLoading} />
              </Panel>
              <Panel num={5} title="SCHEDULED DELIVERIES">
                {mediaItems.length === 0 ? (
                  <span
                    className="text-[11px] tracking-[0.15em]"
                    style={{ color: 'var(--bp-ink3)' }}
                  >
                    NONE PENDING
                  </span>
                ) : (
                  <div className="space-y-1 overflow-hidden">
                    {mediaItems.slice(0, 8).map((item, i) => {
                      const d = new Date(item.date + 'T00:00:00')
                      const isToday = d.toDateString() === new Date().toDateString()
                      return (
                        <div key={i} className="flex items-baseline gap-2 text-[11px]">
                          <span
                            className="w-10 flex-shrink-0 tabular-nums"
                            style={{ color: isToday ? 'var(--bp-red)' : 'var(--bp-ink3)' }}
                          >
                            {isToday
                              ? 'TODAY'
                              : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                          </span>
                          <span className="truncate uppercase tracking-[0.05em]">{item.title}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>
              <Panel num={6} title="GENERAL NOTES · LÉXICO">
                {wordOfDay ? (
                  <WordOfDayWidget
                    word={wordOfDay}
                    compact
                    label=""
                    style={{ color: 'var(--bp-ink)' }}
                  />
                ) : (
                  <span className="text-[11px]" style={{ color: 'var(--bp-ink3)' }}>
                    —
                  </span>
                )}
              </Panel>
            </div>

            <Panel
              num={7}
              title={showRadar && radarData ? 'PRECIPITATION SURVEY' : 'SITE PHOTOGRAPH'}
              right={showRadar && radarData ? undefined : 'FIG. 1'}
              className="flex-1 min-h-0"
              bodyClassName="p-1.5"
            >
              {showRadar && radarData ? (
                <div className="h-full min-h-0 overflow-hidden">
                  <RadarTiles data={radarData} fill />
                </div>
              ) : (
                <SitePhotograph photos={photos} dark={dark} />
              )}
            </Panel>

            <TitleBlock sobrietyDate={sobrietyDate} />
          </div>

          <GeneralConditions piholeData={piholeData} sessions={sessions} haData={haData} />
        </div>
      </div>
    </div>
  )
}
