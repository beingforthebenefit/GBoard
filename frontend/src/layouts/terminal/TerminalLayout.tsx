import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { useSoberCounter } from '../../hooks/useSoberCounter.js'
import { getAstrologySnapshot } from '../../utils/astrology.js'
import { CalendarGrid } from '../../components/CalendarGrid.js'
import { LayoutProps } from '../index.js'

// ── Helpers ──

function pad(n: number, w = 2) {
  return String(n).padStart(w, '0')
}

function fmtTime12(d: Date) {
  const h = d.getHours()
  const m = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m}:${s} ${ampm}`
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtUnix(unix: number) {
  const d = new Date(unix * 1000)
  const h = d.getHours()
  const m = pad(d.getMinutes())
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m}${ampm}`
}

function windArrow(dir: string) {
  const arrows: Record<string, string> = {
    N: '↓',
    NE: '↙',
    E: '←',
    SE: '↖',
    S: '↑',
    SW: '↗',
    W: '→',
    NW: '↘',
  }
  return arrows[dir] ?? dir
}

function dayLabel(dateStr: string, idx: number) {
  if (idx === 0) return 'TODAY'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

// ── ASCII box helper ──

function Box({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="text-green-500/60 text-[10px] uppercase tracking-[0.15em] mb-0.5">
        {title}
      </div>
      <div className="border border-green-500/30 rounded-sm p-2">{children}</div>
    </div>
  )
}

// ── Sections ──

function TermClock() {
  const now = useClock()
  return (
    <div>
      <div className="text-[clamp(3rem,7vw,5rem)] leading-none font-mono tracking-[0.08em] text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.4)]">
        {fmtTime12(now)}
      </div>
      <div className="text-green-500/60 text-sm font-mono mt-1">{fmtDate(now)}</div>
    </div>
  )
}

function TermWeather({
  weatherData: data,
  weatherLoading: loading,
}: Pick<LayoutProps, 'weatherData' | 'weatherLoading'>) {
  if (loading) return <span className="text-green-500/40">loading...</span>
  if (!data) return <span className="text-green-500/40">unavailable</span>

  const { current, forecast } = data
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-mono text-green-400">{current.temp}&deg;F</span>
        <span className="text-green-500/70 capitalize">{current.description}</span>
      </div>
      <div className="text-green-500/50 text-xs font-mono grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span>feels {current.feelsLike}&deg;</span>
        <span>humid {current.humidity}%</span>
        <span>
          wind {current.windSpeed}mph {windArrow(current.windDirection)}
          {current.windGust != null && ` (${current.windGust}g)`}
        </span>
        <span>dew {current.dewPoint}&deg;</span>
        <span>pres {current.pressure}hPa</span>
        <span>vis {current.visibility}mi</span>
        <span>☀ {fmtUnix(current.sunrise)}</span>
        <span>☾ {fmtUnix(current.sunset)}</span>
      </div>
      <div className="flex gap-3 text-xs font-mono pt-1 border-t border-green-500/15">
        {forecast.slice(0, 5).map((day, i) => (
          <div key={day.date} className="text-center">
            <div className="text-green-500/50">{dayLabel(day.date, i)}</div>
            <div className="text-green-400">
              {day.high}&deg;/{day.low}&deg;
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TermSober({ sobrietyDate }: { sobrietyDate: string }) {
  const { years, months, days, hours } = useSoberCounter(sobrietyDate)
  return (
    <div className="flex gap-4 font-mono">
      {[
        { v: years, l: 'YR' },
        { v: months, l: 'MO' },
        { v: days, l: 'DY' },
        { v: hours, l: 'HR' },
      ].map(({ v, l }) => (
        <div key={l} className="text-center">
          <div className="text-2xl text-green-400 tabular-nums leading-none">{v}</div>
          <div className="text-[10px] text-green-500/40">{l}</div>
        </div>
      ))}
    </div>
  )
}

function TermPihole({
  piholeData: data,
  piholeLoading: loading,
}: Pick<LayoutProps, 'piholeData' | 'piholeLoading'>) {
  if (loading) return <span className="text-green-500/40">loading...</span>
  if (!data) return <span className="text-green-500/40">offline</span>

  return (
    <div className="font-mono text-xs space-y-1">
      <div className="flex gap-4">
        <span className="text-green-400">{data.totalQueries.toLocaleString()}</span>
        <span className="text-green-500/50">qry/24h</span>
        <span className="text-green-400">{data.blockedPercentage.toFixed(1)}%</span>
        <span className="text-green-500/50">blocked</span>
        <span className={data.status === 'enabled' ? 'text-green-400' : 'text-red-400'}>
          ● {data.status === 'enabled' ? 'ON' : 'OFF'}
        </span>
      </div>
      {data.clients.length > 0 && (
        <div className="text-green-500/40 flex gap-3 flex-wrap">
          {data.clients.slice(0, 5).map((c) => (
            <span key={c.ip}>
              {c.name || c.ip}: {c.queries}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function TermPlex({
  sessions,
  plexLoading: loading,
}: Pick<LayoutProps, 'sessions' | 'plexLoading'>) {
  if (loading) return <span className="text-green-500/40">loading...</span>
  if (sessions.length === 0)
    return <span className="text-green-500/30 text-xs">nothing playing</span>

  return (
    <div className="space-y-1">
      {sessions.map((s, i) => {
        const pct = s.duration > 0 ? Math.round((s.viewOffset / s.duration) * 100) : 0
        const state = s.playerState === 'playing' ? '▶' : s.playerState === 'paused' ? '⏸' : '…'
        return (
          <div key={i} className="font-mono text-xs">
            <span className="text-green-400">
              {state} {s.title}
            </span>
            {s.subtitle && <span className="text-green-500/50"> — {s.subtitle}</span>}
            <span className="text-green-500/30"> [{pct}%]</span>
            <span className="text-green-500/30"> • {s.userName}</span>
          </div>
        )
      })}
    </div>
  )
}

function TermMedia({
  mediaItems: items,
  mediaLoading: loading,
}: Pick<LayoutProps, 'mediaItems' | 'mediaLoading'>) {
  if (loading) return <span className="text-green-500/40">loading...</span>
  if (items.length === 0) return <span className="text-green-500/30 text-xs">nothing upcoming</span>

  return (
    <div className="space-y-0.5 font-mono text-xs">
      {items.slice(0, 7).map((item, i) => {
        const d = new Date(item.date)
        const isToday = new Date().toDateString() === d.toDateString()
        const label = isToday
          ? 'TODAY'
          : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
        const icon = item.type === 'movie' ? '🎬' : 'TV'
        return (
          <div key={i} className="flex gap-2">
            <span className="text-green-500/40 w-12 text-right shrink-0">{label}</span>
            <span className="text-green-500/50 w-6 shrink-0">{icon}</span>
            <span className="text-green-400 truncate">{item.title}</span>
            {item.subtitle && (
              <span className="text-green-500/40 truncate hidden sm:inline">{item.subtitle}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TermAstro() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const snap = useMemo(() => getAstrologySnapshot(now), [now])
  return (
    <div className="font-mono text-xs space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-green-400 text-lg">{snap.sign.glyph}</span>
        <span className="text-green-400 text-base font-semibold">{snap.sign.name}</span>
        <span className="text-green-500/40">{snap.signRange}</span>
      </div>
      <div className="text-green-500/50 flex flex-wrap gap-x-3">
        <span>
          {snap.moon.emoji} {snap.moon.name}
        </span>
        <span>day: {snap.weekday.dayName}</span>
        <span>ruler: {snap.weekday.ruler}</span>
        <span>
          elem: {snap.sign.element} · {snap.sign.modality}
        </span>
        <span>lucky: {snap.luckyWindow}</span>
      </div>
      <div className="text-green-500/30 italic">{snap.message}</div>
    </div>
  )
}

function TermPhoto({ photos }: Pick<LayoutProps, 'photos'>) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [nextIdx, setNextIdx] = useState(1)
  const [fading, setFading] = useState(false)
  const shuffled = useMemo(() => {
    if (photos.length === 0) return []
    const arr = [...photos]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [photos])

  const advance = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % shuffled.length)
    setNextIdx((prev) => (prev + 1) % shuffled.length)
    setFading(false)
  }, [shuffled.length])

  useEffect(() => {
    if (shuffled.length < 2) return
    const id = setInterval(() => {
      setFading(true)
      setTimeout(advance, 800)
    }, 300_000)
    return () => clearInterval(id)
  }, [shuffled, advance])

  if (shuffled.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-green-500/20 font-mono text-xs text-center">
        [ PHOTO FEED ]
        <br />
        ---- iCloud Album ----
        <br />
        rotates every 5 min
      </div>
    )
  }

  const currentPhoto = fading ? shuffled[nextIdx] : shuffled[currentIdx]
  const captionParts = []
  if (currentPhoto.location?.city) {
    const loc = currentPhoto.location
    captionParts.push(loc.city + (loc.state ? `, ${loc.state}` : ''))
  }
  if (currentPhoto.dateTaken) {
    const d = new Date(currentPhoto.dateTaken)
    captionParts.push(
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    )
  }

  return (
    <div className="h-full relative overflow-hidden rounded-sm border border-green-500/20">
      <img
        src={shuffled[currentIdx].url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{
          filter: 'saturate(0) brightness(0.7) contrast(1.1)',
          opacity: fading ? 0 : 1,
        }}
      />
      {shuffled.length > 1 && (
        <img
          src={shuffled[nextIdx].url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(0) brightness(0.7) contrast(1.1)' }}
        />
      )}
      <div className="absolute inset-0 bg-green-900/20 mix-blend-overlay pointer-events-none" />
      {captionParts.length > 0 && (
        <div className="absolute bottom-1 left-2 text-green-500/40 text-[10px] font-mono z-10 pointer-events-none">
          [{captionParts.join(' | ')}]
        </div>
      )}
    </div>
  )
}

// ── Blinking cursor ──

function BlinkCursor() {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 530)
    return () => clearInterval(id)
  }, [])
  return (
    <span
      className="inline-block w-[0.6em] h-[1.1em] align-text-bottom bg-green-400"
      style={{ opacity: on ? 1 : 0 }}
    />
  )
}

// ── Main layout ──

export function TerminalLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  plexLoading,
  piholeData,
  piholeLoading,
  photos,
  mediaItems,
  mediaLoading,
  sobrietyDate,
}: LayoutProps) {
  const now = useClock()
  const uptime = useMemo(() => {
    const startStr = import.meta.env.VITE_SOBRIETY_DATE as string
    if (!startStr) return '0d 0h'
    const start = new Date(startStr)
    const diff = now.getTime() - start.getTime()
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    return `${d}d ${h}h`
  }, [now])

  // Capture a stable "last sync" timestamp that only updates on data changes
  const lastSync = useRef(new Date())
  const prevDataRef = useRef<string>('')
  const dataFingerprint = `${weatherData?.current.temp}-${events.length}-${sessions.length}-${piholeData?.totalQueries}`
  if (dataFingerprint !== prevDataRef.current) {
    prevDataRef.current = dataFingerprint
    lastSync.current = new Date()
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-black text-green-400 font-mono selection:bg-green-400/20">
      {/* Scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
        }}
      />
      {/* CRT vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)',
        }}
      />

      {/* Header bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 border-b border-green-500/25 text-xs text-green-500/50">
        <span>
          <span className="text-green-400 font-bold">gerald@gboard</span> ~ $
        </span>
        <span className="flex gap-4">
          <span>up {uptime}</span>
        </span>
      </div>

      {/* Main content — no scroll, fits screen */}
      <div className="flex-1 min-h-0 flex flex-col p-4 gap-2.5">
        {/* Clock */}
        <div className="flex-shrink-0">
          <TermClock />
        </div>

        {/* Weather + Sober side by side */}
        <div className="flex-shrink-0 grid grid-cols-[1fr_auto] gap-4">
          <Box title="WEATHER">
            <TermWeather weatherData={weatherData} weatherLoading={weatherLoading} />
          </Box>
          <Box title="SOBER TIME">
            <TermSober sobrietyDate={sobrietyDate} />
          </Box>
        </div>

        {/* Pi-hole */}
        <div className="flex-shrink-0">
          <Box title="PI-HOLE">
            <TermPihole piholeData={piholeData} piholeLoading={piholeLoading} />
          </Box>
        </div>

        {/* Plex */}
        <div className="flex-shrink-0">
          <Box title="PLEX ▸">
            <TermPlex sessions={sessions} plexLoading={plexLoading} />
          </Box>
        </div>

        {/* Photo — fills remaining space */}
        <div className="flex-1 min-h-0">
          <TermPhoto photos={photos} />
        </div>

        {/* Upcoming + Calendar side by side */}
        <div className="flex-shrink-0 grid grid-cols-2 gap-4">
          <Box title="UPCOMING">
            <TermMedia mediaItems={mediaItems} mediaLoading={mediaLoading} />
          </Box>
          <Box title="CALENDAR">
            <CalendarGrid
              events={events}
              loading={calendarLoading}
              numDays={4}
              hourHeight={28}
              eventColors={['#22c55e']}
              className="font-mono"
              style={
                {
                  '--cal-accent': '#22c55e',
                  '--cal-day': 'rgba(34,197,94,0.4)',
                  '--cal-gutter': 'rgba(34,197,94,0.3)',
                  '--cal-grid': 'rgba(34,197,94,0.08)',
                  '--cal-grid-strong': 'rgba(34,197,94,0.2)',
                  '--cal-today-bg': 'rgba(34,197,94,0.04)',
                  '--cal-event-text': '#000',
                  '--cal-event-time': 'rgba(0,0,0,0.6)',
                } as React.CSSProperties
              }
            />
          </Box>
        </div>

        {/* Cosmic */}
        <div className="flex-shrink-0">
          <Box title="COSMIC">
            <TermAstro />
          </Box>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1 border-t border-green-500/25 text-xs text-green-500/40">
        <span>gboard v2.0 · docker</span>
        <span>
          polls 10s · last sync {fmtTime12(lastSync.current).toLowerCase()} <BlinkCursor />
        </span>
      </div>
    </div>
  )
}
