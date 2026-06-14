import { useEffect, useMemo, useRef, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { useIsDark } from '../../hooks/useIsDark.js'
import { useElementSize } from '../../hooks/useElementSize.js'
import { buildThumborUrl } from '../../utils/thumbor.js'
import { HourlyChart } from '../../components/HourlyChart.js'
import { MoonPhase } from '../../components/MoonPhase.js'
import { WindCompass } from '../../components/WindCompass.js'
import { SunArcWidget } from '../../components/SunArcWidget.js'
import { CalendarGrid } from '../../components/CalendarGrid.js'
import { RadarTiles } from '../../components/RadarTiles.js'
import { WordOfDayWidget } from '../../components/WordOfDay.js'
import { useSoberCounter } from '../../hooks/useSoberCounter.js'
import { LayoutProps, shouldShowRadar } from '../index.js'

// ── Palettes (the layout drives all child widgets through CSS variables) ──

const NIGHT_VARS = {
  '--obs-bg': '#0a0f1e',
  '--obs-panel': '#10182e',
  '--obs-gold': '#c9a44a',
  '--text': '#d8d4c8',
  '--text-2': '#a8a294',
  '--text-3': '#6d6a5e',
  '--text-4': '#3c3f4e',
  '--surface': '#10182e',
  '--border': 'rgba(201, 164, 74, 0.22)',
  '--hourly-line': '#c9a44a',
  '--hourly-area': 'rgba(201, 164, 74, 0.12)',
  '--hourly-pop': '#5b7fd4',
  '--moon-dark': '#1c2236',
  '--moon-lit': '#e8e4d4',
  '--moon-ring': 'rgba(255, 255, 255, 0.15)',
  '--compass-needle': '#c9a44a',
  '--compass-ring': 'rgba(201, 164, 74, 0.3)',
  '--progress-bg': 'rgba(201, 164, 74, 0.15)',
  '--milestone-ring': '#c9a44a',
  '--sober-text': '#c9a44a',
} as React.CSSProperties

const DAY_VARS = {
  '--obs-bg': '#f0ead9',
  '--obs-panel': '#f8f4e8',
  '--obs-gold': '#9a7b2d',
  '--text': '#2c2a26',
  '--text-2': '#5c574c',
  '--text-3': '#8d8775',
  '--text-4': '#c5bda6',
  '--surface': '#f8f4e8',
  '--border': 'rgba(154, 123, 45, 0.3)',
  '--hourly-line': '#9a7b2d',
  '--hourly-area': 'rgba(154, 123, 45, 0.12)',
  '--hourly-pop': '#4a6db3',
  // Keep the lit side bright even on parchment: dark disc, light fill
  '--moon-dark': '#5c574c',
  '--moon-lit': '#f5efdf',
  '--moon-ring': 'rgba(44, 42, 38, 0.3)',
  '--compass-needle': '#9a7b2d',
  '--compass-ring': 'rgba(154, 123, 45, 0.35)',
  '--progress-bg': 'rgba(154, 123, 45, 0.15)',
  '--milestone-ring': '#9a7b2d',
  '--sober-text': '#9a7b2d',
} as React.CSSProperties

const NIGHT_STARS =
  'radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,0.5), transparent), ' +
  'radial-gradient(1px 1px at 38% 8%, rgba(255,255,255,0.35), transparent), ' +
  'radial-gradient(1.5px 1.5px at 64% 30%, rgba(255,255,255,0.4), transparent), ' +
  'radial-gradient(1px 1px at 82% 12%, rgba(255,255,255,0.45), transparent), ' +
  'radial-gradient(1px 1px at 92% 42%, rgba(255,255,255,0.3), transparent)'

function Panel({
  title,
  children,
  className = '',
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${className}`}
      style={{ background: 'var(--obs-panel)', borderColor: 'var(--border)' }}
    >
      {title && (
        <div
          className="text-[10px] uppercase tracking-[0.25em] mb-1.5"
          style={{ color: 'var(--obs-gold)' }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Masthead ──

function Masthead({ sobrietyDate }: { sobrietyDate: string }) {
  const now = useClock()
  const { years, months, days } = useSoberCounter(sobrietyDate)
  const h = now.getHours()
  const timeStr = `${h % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="flex items-end justify-between border-b pb-2.5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div>
        <div
          className="font-serif text-3xl tracking-[0.12em] uppercase"
          style={{ color: 'var(--text)' }}
        >
          The Observatory
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
          {dateStr}
        </div>
      </div>
      <div className="text-right">
        <div
          className="font-serif text-4xl tabular-nums leading-none"
          style={{ color: 'var(--text)' }}
        >
          {timeStr}
          <span className="text-base ml-1" style={{ color: 'var(--text-3)' }}>
            {h >= 12 ? 'PM' : 'AM'}
          </span>
        </div>
        <div className="text-[11px] mt-1 tracking-[0.15em]" style={{ color: 'var(--obs-gold)' }}>
          MISSION CLOCK · {years}Y {months}M {days}D CLEAR SKIES
        </div>
      </div>
    </div>
  )
}

// ── Porthole photo ──

function PortholePhoto({ photos }: Pick<LayoutProps, 'photos'>) {
  const shuffled = useMemo(() => {
    const arr = [...photos]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [photos])
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const size = useElementSize(ref)

  useEffect(() => {
    if (shuffled.length < 2) return
    const id = setInterval(() => setIdx((i) => (i + 1) % shuffled.length), 300_000)
    return () => clearInterval(id)
  }, [shuffled.length])

  const current = shuffled.length > 0 ? shuffled[idx % shuffled.length] : null
  // size is dpr-scaled; divide back to CSS pixels for the element dimensions
  const sideDevice = size ? Math.min(size.width, size.height) : 0
  const sideCss = sideDevice / (window.devicePixelRatio || 1)
  const src =
    current && sideDevice > 0
      ? buildThumborUrl(current.filename, sideDevice, sideDevice, 'cover')
      : null

  return (
    <div ref={ref} className="h-full w-full flex items-center justify-center">
      <div
        className="rounded-full overflow-hidden border-4 relative flex-shrink-0"
        style={{ borderColor: 'var(--obs-gold)', width: sideCss, height: sideCss }}
      >
        {src ? (
          <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs"
            style={{ color: 'var(--text-3)', background: 'var(--obs-panel)' }}
          >
            ◌ no signal
          </div>
        )}
      </div>
    </div>
  )
}

// ── Telemetry footer ──

function Telemetry({ sessions, piholeData }: Pick<LayoutProps, 'sessions' | 'piholeData'>) {
  const parts: string[] = []
  if (piholeData) {
    parts.push(
      `SHIELD ${piholeData.status === 'enabled' ? 'UP' : 'DOWN'} · ${piholeData.totalQueries.toLocaleString()} SIGNALS · ${piholeData.blockedPercentage.toFixed(1)}% DEFLECTED`
    )
  }
  for (const s of sessions) {
    const pct = s.duration > 0 ? Math.round((s.viewOffset / s.duration) * 100) : 0
    parts.push(`TRACKING "${s.title.toUpperCase()}" · ${s.userName.toUpperCase()} · ${pct}%`)
  }
  if (parts.length === 0) parts.push('ALL INSTRUMENTS NOMINAL')

  return (
    <div
      className="font-mono text-[11px] tracking-[0.08em] flex flex-wrap gap-x-6 gap-y-0.5 border-t pt-2"
      style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}
    >
      {parts.map((p, i) => (
        <span key={i}>{p}</span>
      ))}
    </div>
  )
}

// ── Main layout ──

export function ObservatoryLayout({
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
}: LayoutProps) {
  const dark = useIsDark()
  const showRadar = shouldShowRadar(radarMode, radarData)
  const vars = dark ? NIGHT_VARS : DAY_VARS

  // OpenWeather's hourly feed can be 3-hourly; report the real span the chart covers
  const chartPoints = weatherData?.hourly.slice(0, 12) ?? []
  const chartSpanHours =
    chartPoints.length >= 2
      ? Math.round(
          (chartPoints[chartPoints.length - 1].time -
            chartPoints[0].time +
            (chartPoints[1].time - chartPoints[0].time)) /
            3600
        )
      : 0
  const chartTitle = weatherData
    ? `Next ${chartSpanHours} Hours · ${weatherData.current.temp}° ${weatherData.current.description}`
    : 'Sky Outlook'

  return (
    <div
      className="h-screen w-full overflow-hidden flex flex-col p-5 gap-3"
      style={{
        ...vars,
        background: dark ? `${NIGHT_STARS}, var(--obs-bg)` : 'var(--obs-bg)',
        backgroundColor: dark ? '#0a0f1e' : '#f0ead9',
        color: 'var(--text)',
      }}
    >
      <div className="flex-shrink-0">
        <Masthead sobrietyDate={sobrietyDate} />
      </div>

      {/* Instruments row */}
      <div className="flex-shrink-0 grid grid-cols-[2fr_1fr_1fr] gap-3 items-stretch">
        <div
          style={
            { '--surface': '#10182e', '--border': 'rgba(201,164,74,0.25)' } as React.CSSProperties
          }
        >
          <SunArcWidget
            sunrise={weatherData?.current.sunrise ?? null}
            sunset={weatherData?.current.sunset ?? null}
            loading={weatherLoading}
          />
        </div>
        <Panel title="Lunar Phase" className="flex flex-col items-center justify-center">
          <MoonPhase />
        </Panel>
        <Panel title="Wind" className="flex flex-col items-center justify-center">
          {weatherData ? (
            <WindCompass
              speed={weatherData.current.windSpeed}
              direction={weatherData.current.windDirection}
              gust={weatherData.current.windGust}
            />
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              —
            </span>
          )}
        </Panel>
      </div>

      {/* Hourly chart + radar */}
      <div className="flex-shrink-0 flex gap-3 items-stretch">
        <Panel title={chartTitle} className="flex-1 min-w-0">
          <HourlyChart data={weatherData} loading={weatherLoading} />
        </Panel>
        {showRadar && radarData && (
          <Panel title="Atmospherics" className="w-64 flex-shrink-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden rounded">
              <RadarTiles data={radarData} fill />
            </div>
          </Panel>
        )}
      </div>

      {/* Calendar + ephemeris row, porthole photo fills what's left */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="flex-shrink-0 grid grid-cols-[5fr_2fr] gap-3 items-stretch">
          <Panel title="Observation Schedule" className="min-w-0 overflow-hidden">
            <CalendarGrid
              events={events}
              loading={calendarLoading}
              numDays={4}
              hourHeight={24}
              eventColors={dark ? ['#c9a44a'] : ['#9a7b2d']}
              className="font-serif"
              style={
                {
                  '--cal-accent': 'var(--obs-gold)',
                  '--cal-day': 'var(--text-3)',
                  '--cal-gutter': 'var(--text-3)',
                  '--cal-grid': dark ? 'rgba(201,164,74,0.08)' : 'rgba(154,123,45,0.1)',
                  '--cal-grid-strong': dark ? 'rgba(201,164,74,0.2)' : 'rgba(154,123,45,0.25)',
                  '--cal-today-bg': dark ? 'rgba(201,164,74,0.05)' : 'rgba(154,123,45,0.05)',
                  '--cal-event-text': dark ? '#0a0f1e' : '#f8f4e8',
                  '--cal-event-time': dark ? 'rgba(10,15,30,0.6)' : 'rgba(248,244,232,0.7)',
                } as React.CSSProperties
              }
            />
          </Panel>
          <div className="flex flex-col gap-3 min-w-0">
            <Panel title="Ephemeris" className="min-w-0 overflow-hidden">
              {mediaItems.length === 0 ? (
                <div className="text-xs italic" style={{ color: 'var(--text-3)' }}>
                  Nothing on the horizon
                </div>
              ) : (
                <div className="space-y-1">
                  {mediaItems.slice(0, 8).map((item, i) => {
                    const d = new Date(item.date + 'T00:00:00')
                    const isToday = d.toDateString() === new Date().toDateString()
                    return (
                      <div key={i} className="flex items-baseline gap-2 text-xs leading-snug">
                        <span
                          className="w-10 flex-shrink-0 tabular-nums"
                          style={{ color: isToday ? 'var(--obs-gold)' : 'var(--text-3)' }}
                        >
                          {isToday
                            ? 'Today'
                            : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                        </span>
                        <span className="truncate" style={{ color: 'var(--text-2)' }}>
                          {item.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
            {wordOfDay && (
              <Panel title="Léxico · Palabra del Día" className="flex-1 min-w-0">
                <WordOfDayWidget
                  word={wordOfDay}
                  compact
                  label=""
                  style={{ color: 'var(--text)' }}
                />
              </Panel>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <PortholePhoto photos={photos} />
        </div>
      </div>

      <div className="flex-shrink-0">
        <Telemetry sessions={sessions} piholeData={piholeData} />
      </div>
    </div>
  )
}
