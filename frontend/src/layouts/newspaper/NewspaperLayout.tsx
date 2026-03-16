import { useEffect, useMemo, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { useSoberCounter } from '../../hooks/useSoberCounter.js'
import { getAstrologySnapshot } from '../../utils/astrology.js'
import { CalendarGrid } from '../../components/CalendarGrid.js'
import { LayoutProps } from '../index.js'

// ── Helpers ──

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmtUnix(unix: number) {
  const d = new Date(unix * 1000)
  const h = d.getHours()
  const m = pad(d.getMinutes())
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m}${ampm}`
}

// ── Dark mode hook ──

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

// ── Masthead / Clock ──

function Masthead({ dark }: { dark: boolean }) {
  const now = useClock()
  const h = now.getHours()
  const m = pad(now.getMinutes())
  const s = pad(now.getSeconds())
  const ampm = h >= 12 ? 'PM' : 'AM'
  const timeStr = `${h % 12 || 12}:${m}`

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const textColor = dark ? 'text-neutral-100' : 'text-black'
  const subtleColor = dark ? 'text-neutral-500' : 'text-neutral-400'
  const ruleColor = dark ? 'border-neutral-700' : 'border-black'
  const dividerColor = dark ? 'bg-neutral-600' : 'bg-black/20'

  return (
    <div className={`text-center border-b-2 ${ruleColor} pb-3 mb-3`}>
      <div className={`text-[10px] tracking-[0.3em] uppercase ${subtleColor} mb-1`}>{dateStr}</div>
      <div className={`font-serif text-5xl font-bold tracking-tight ${textColor} leading-none`}>
        Gerald&rsquo;s Dashboard
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        <div className={`h-px flex-1 ${dividerColor}`} />
        <span className={`text-2xl tabular-nums font-light ${textColor}`}>
          {timeStr}
          <span className={`text-sm ${subtleColor}`}>:{s}</span>
          <span className={`text-xs ml-1 ${subtleColor}`}>{ampm}</span>
        </span>
        <div className={`h-px flex-1 ${dividerColor}`} />
      </div>
    </div>
  )
}

// ── Weather headline ──

function WeatherHeadline({
  weatherData: data,
  weatherLoading: loading,
  dark,
}: Pick<LayoutProps, 'weatherData' | 'weatherLoading'> & { dark: boolean }) {
  if (loading || !data) return null
  const { current, forecast } = data

  const textColor = dark ? 'text-neutral-100' : 'text-black'
  const subtleColor = dark ? 'text-neutral-500' : 'text-neutral-400'
  const borderColor = dark ? 'border-neutral-700' : 'border-neutral-200'
  const chipBg = dark ? 'bg-neutral-800' : 'bg-neutral-50'

  return (
    <div>
      <div className="flex items-end gap-3 mb-2">
        <span className={`text-6xl font-serif font-bold ${textColor} leading-none`}>
          {current.temp}&deg;
        </span>
        <div className="pb-1">
          <div className={`text-lg font-serif capitalize ${textColor} leading-tight`}>
            {current.description}
          </div>
          <div className={`text-xs ${subtleColor}`}>
            Feels {current.feelsLike}&deg; · {current.humidity}% · Wind {current.windSpeed}mph{' '}
            {current.windDirection}
          </div>
        </div>
      </div>
      <div className={`flex gap-1.5 border-t ${borderColor} pt-2`}>
        {forecast.slice(0, 5).map((day) => {
          const todayStr = new Date().toLocaleDateString('en-CA')
          const label =
            day.date === todayStr
              ? 'Today'
              : new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                })
          return (
            <div key={day.date} className={`flex-1 text-center py-1.5 rounded ${chipBg}`}>
              <div className={`text-[10px] font-semibold ${subtleColor} uppercase`}>{label}</div>
              <img
                src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                alt=""
                className="w-7 h-7 mx-auto"
                style={dark ? { filter: 'brightness(1.2)' } : undefined}
              />
              <div className="text-xs">
                <span className={`font-semibold ${textColor}`}>{day.high}&deg;</span>
                <span className={subtleColor}> {day.low}&deg;</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className={`flex gap-3 text-[11px] ${subtleColor} mt-1.5 justify-end`}>
        <span>&uarr; {fmtUnix(current.sunrise)}</span>
        <span>&darr; {fmtUnix(current.sunset)}</span>
        <span>Dew {current.dewPoint}&deg;</span>
        <span>{current.pressure}hPa</span>
      </div>
    </div>
  )
}

// ── Sober + Pi-hole ticker bar ──

function TickerBar({
  sobrietyDate,
  piholeData,
  dark,
}: {
  sobrietyDate: string
  piholeData: LayoutProps['piholeData']
  dark: boolean
}) {
  const { years, months, days, hours } = useSoberCounter(sobrietyDate)

  const textColor = dark ? 'text-neutral-100' : 'text-black'
  const subtleColor = dark ? 'text-neutral-500' : 'text-neutral-400'
  const borderColor = dark ? 'border-neutral-700' : 'border-black'
  const innerBorder = dark ? 'border-neutral-700' : 'border-neutral-300'

  return (
    <div className={`flex items-center gap-0 border-y ${borderColor} py-1.5 text-xs`}>
      <div className={`flex items-center gap-3 pr-4 border-r ${innerBorder}`}>
        <span className={`font-semibold uppercase tracking-wider text-[10px] ${subtleColor}`}>
          Sober
        </span>
        <div className="flex gap-2 tabular-nums">
          {[
            { v: years, l: 'y' },
            { v: months, l: 'm' },
            { v: days, l: 'd' },
            { v: hours, l: 'h' },
          ].map(({ v, l }) => (
            <span key={l} className={`font-semibold text-base ${textColor}`}>
              {v}
              <span className={`text-[10px] ${subtleColor} font-normal`}>{l}</span>
            </span>
          ))}
        </div>
      </div>
      {piholeData && (
        <div className="flex items-center gap-3 pl-4 flex-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              piholeData.status === 'enabled'
                ? dark
                  ? 'bg-neutral-100'
                  : 'bg-black'
                : 'bg-red-400'
            }`}
          />
          <span className={subtleColor}>Pi-hole</span>
          <span className={`font-semibold ${textColor}`}>
            {piholeData.totalQueries.toLocaleString()}
          </span>
          <span className={subtleColor}>queries</span>
          <span className={`font-semibold ${textColor}`}>
            {piholeData.blockedPercentage.toFixed(1)}%
          </span>
          <span className={subtleColor}>blocked</span>
        </div>
      )}
    </div>
  )
}

// ── Photo ──

function NewsPhoto({ photos, dark }: { photos: LayoutProps['photos']; dark: boolean }) {
  const shuffled = useMemo(() => {
    const a = [...photos]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }, [photos])
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    if (shuffled.length === 0) return
    const id = setInterval(() => {
      setFade(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % shuffled.length)
        setFade(false)
      }, 500)
    }, 300_000)
    return () => clearInterval(id)
  }, [shuffled.length])

  if (shuffled.length === 0) {
    return (
      <div
        className={`h-full flex items-center justify-center text-sm italic font-serif ${
          dark ? 'bg-neutral-900 text-neutral-600' : 'bg-neutral-50 text-neutral-300'
        }`}
      >
        Photo of the Day
      </div>
    )
  }

  const current = shuffled[idx % shuffled.length]
  const captionParts: string[] = []
  if (current.location?.city) {
    const loc = current.location
    captionParts.push(loc.city + (loc.state ? `, ${loc.state}` : ''))
  }
  if (current.dateTaken) {
    const d = new Date(current.dateTaken)
    captionParts.push(
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <img
          src={current.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: fade ? 0 : 1 }}
        />
      </div>
      {captionParts.length > 0 && (
        <div
          className={`text-xs italic font-serif mt-1 leading-tight ${
            dark ? 'text-neutral-500' : 'text-neutral-400'
          }`}
        >
          {captionParts.join(' — ')}
        </div>
      )}
    </div>
  )
}

// ── Plex ──

function NewsPlex({ sessions, dark }: { sessions: LayoutProps['sessions']; dark: boolean }) {
  if (sessions.length === 0) return null

  const textColor = dark ? 'text-neutral-100' : 'text-black'
  const subtleColor = dark ? 'text-neutral-500' : 'text-neutral-400'
  const barBg = dark ? 'bg-neutral-700' : 'bg-neutral-200'
  const barFill = dark ? 'bg-neutral-100' : 'bg-black'

  return (
    <div className="space-y-2">
      {sessions.map((s, i) => {
        const pct = s.duration > 0 ? Math.round((s.viewOffset / s.duration) * 100) : 0
        return (
          <div key={i}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 pulse-dot" />
              <span className={`text-sm font-serif font-semibold ${textColor} truncate`}>
                {s.title}
              </span>
              <span className={`text-xs ${subtleColor} truncate`}>{s.subtitle}</span>
              <span className={`text-xs ${subtleColor} ml-auto shrink-0`}>{pct}%</span>
            </div>
            <div className={`w-full h-1 ${barBg} rounded-full overflow-hidden`}>
              <div className={`h-full ${barFill} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Upcoming ──

function NewsMedia({
  mediaItems: items,
  mediaLoading: loading,
  dark,
}: Pick<LayoutProps, 'mediaItems' | 'mediaLoading'> & { dark: boolean }) {
  if (loading) return null

  const textColor = dark ? 'text-neutral-100' : 'text-black'
  const subtleColor = dark ? 'text-neutral-500' : 'text-neutral-400'
  const dotColor = dark ? 'text-neutral-600' : 'text-neutral-300'

  if (items.length === 0) return <div className={`${subtleColor} text-xs italic`}>&mdash;</div>

  return (
    <div className="space-y-0.5">
      {items.slice(0, 7).map((item, i) => {
        const d = new Date(item.date + 'T00:00:00')
        const isToday = new Date().toDateString() === d.toDateString()
        const label = isToday
          ? 'Today'
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={i} className="flex items-baseline gap-2 text-sm leading-snug">
            <span className={dotColor}>&bull;</span>
            <span className={`font-serif ${textColor} truncate flex-1`}>{item.title}</span>
            <span className={`text-[11px] ${subtleColor} shrink-0`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Astrology ──

function NewsAstro({ dark }: { dark: boolean }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const textColor = dark ? 'text-neutral-100' : 'text-black'
  const subtleColor = dark ? 'text-neutral-500' : 'text-neutral-400'

  const snap = useMemo(() => getAstrologySnapshot(now), [now])
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{snap.sign.glyph}</span>
        <span className={`font-serif text-lg font-bold ${textColor}`}>{snap.sign.name}</span>
        <span className={`text-xs ${subtleColor}`}>{snap.signRange}</span>
      </div>
      <div className={`flex flex-wrap gap-x-2.5 text-[11px] ${subtleColor}`}>
        <span>{snap.weekday.dayName}</span>
        <span>
          {snap.moon.emoji} {snap.moon.name}
        </span>
        <span>
          {snap.sign.element} · {snap.sign.modality}
        </span>
        <span>Lucky {snap.luckyWindow}</span>
      </div>
      <div className={`text-xs ${subtleColor} italic mt-1 font-serif leading-snug`}>
        {snap.message}
      </div>
    </div>
  )
}

// ── Section header ──

function SectionHead({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  const subtleColor = dark ? 'text-neutral-500' : 'text-neutral-400'
  const borderColor = dark ? 'border-neutral-700' : 'border-neutral-200'
  return (
    <div
      className={`text-[10px] font-bold uppercase tracking-[0.15em] ${subtleColor} border-b ${borderColor} pb-1 mb-2`}
    >
      {children}
    </div>
  )
}

// ── Main layout ──

export function NewspaperLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  piholeData,
  photos,
  mediaItems,
  mediaLoading,
  sobrietyDate,
}: LayoutProps) {
  const dark = useIsDark()

  const bgColor = dark ? 'bg-neutral-950' : 'bg-[#f5f0e8]'
  const textColor = dark ? 'text-neutral-100' : 'text-black'
  const borderColor = dark ? 'border-neutral-700' : 'border-neutral-200'

  return (
    <div className={`h-screen w-full overflow-hidden flex flex-col ${bgColor} ${textColor}`}>
      <div className="flex-1 min-h-0 flex flex-col px-5 pt-4 pb-5">
        {/* Masthead */}
        <div className="flex-shrink-0">
          <Masthead dark={dark} />
        </div>

        {/* Weather headline */}
        <div className="flex-shrink-0">
          <WeatherHeadline weatherData={weatherData} weatherLoading={weatherLoading} dark={dark} />
        </div>

        {/* Sober + Pi-hole ticker */}
        <div className="flex-shrink-0 mt-3">
          <TickerBar sobrietyDate={sobrietyDate} piholeData={piholeData} dark={dark} />
        </div>

        {/* Photo — fills remaining space */}
        <div className="flex-1 min-h-[120px] mt-3">
          <NewsPhoto photos={photos} dark={dark} />
        </div>

        {/* Plex now playing */}
        {sessions.length > 0 && (
          <div className="flex-shrink-0 mt-3">
            <SectionHead dark={dark}>Now Playing</SectionHead>
            <NewsPlex sessions={sessions} dark={dark} />
          </div>
        )}

        {/* Two-column editorial section */}
        <div className="flex-shrink-0 mt-3 grid grid-cols-2 gap-5">
          <div>
            <SectionHead dark={dark}>Upcoming</SectionHead>
            <NewsMedia mediaItems={mediaItems} mediaLoading={mediaLoading} dark={dark} />
          </div>
          <div>
            <SectionHead dark={dark}>This Week</SectionHead>
            <CalendarGrid
              events={events}
              loading={calendarLoading}
              numDays={4}
              hourHeight={28}
              eventColors={dark ? ['#a0a0a8'] : ['#6b7280']}
              style={
                {
                  '--cal-accent': dark ? '#e8a87c' : '#b8553a',
                  '--cal-day': dark ? 'rgba(160,160,168,0.5)' : 'rgba(0,0,0,0.4)',
                  '--cal-gutter': dark ? 'rgba(160,160,168,0.35)' : 'rgba(0,0,0,0.25)',
                  '--cal-grid': dark ? 'rgba(160,160,168,0.1)' : 'rgba(0,0,0,0.06)',
                  '--cal-grid-strong': dark ? 'rgba(160,160,168,0.2)' : 'rgba(0,0,0,0.12)',
                  '--cal-today-bg': dark ? 'rgba(160,160,168,0.04)' : 'rgba(0,0,0,0.02)',
                  '--cal-event-text': dark ? '#000' : '#fff',
                  '--cal-event-time': dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                } as React.CSSProperties
              }
              className="font-serif"
            />
          </div>
        </div>

        {/* Astrology — footer column */}
        <div className={`flex-shrink-0 mt-3 border-t ${borderColor} pt-3`}>
          <NewsAstro dark={dark} />
        </div>
      </div>
    </div>
  )
}
