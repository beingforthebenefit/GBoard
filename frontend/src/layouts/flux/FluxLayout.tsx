import { ReactNode } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { useSoberCounter } from '../../hooks/useSoberCounter.js'
import { useIsDark } from '../../hooks/useIsDark.js'
import { FluxField } from '../../components/FluxField.js'
import { WeatherHeader } from '../../components/WeatherWidget.js'
import { AgendaList } from '../../components/AgendaList.js'
import { computeMilestoneProgress } from '../../utils/milestones.js'
import { LayoutProps } from '../index.js'

const TEXT_SHADOW = '0 1px 12px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.4)'

// Translucent scrim so widgets stay legible over the moving field — no
// backdrop-blur, which would force the browser to re-blur the canvas each frame.
function Glass({
  children,
  dark,
  className = '',
}: {
  children: ReactNode
  dark: boolean
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        background: dark ? 'rgba(8, 10, 20, 0.4)' : 'rgba(255, 255, 255, 0.55)',
        borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}
    >
      {children}
    </div>
  )
}

function FluxClock() {
  const now = useClock()
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(now)
  const ampm = parts.find((p) => p.type === 'dayPeriod')?.value ?? ''
  const time = parts
    .filter((p) => p.type !== 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .replace(/\s+/g, '')
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={{ textShadow: TEXT_SHADOW }}>
      <div
        className="text-[clamp(3.5rem,9vw,5.5rem)] leading-none font-extralight tabular-nums whitespace-nowrap"
        style={{ color: 'var(--text)' }}
      >
        {time}
        <span className="text-lg font-light ml-2" style={{ color: 'var(--text-2)' }}>
          {ampm}
        </span>
      </div>
      <div className="text-sm font-light mt-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
        {dateStr}
      </div>
    </div>
  )
}

function SoberHero({ sobrietyDate, dark }: { sobrietyDate: string; dark: boolean }) {
  const { years, months, days, hours } = useSoberCounter(sobrietyDate)
  const { next, daysRemaining } = computeMilestoneProgress(new Date(sobrietyDate), new Date())
  const cells = [
    { v: years, l: 'yr' },
    { v: months, l: 'mo' },
    { v: days, l: 'dy' },
    { v: hours, l: 'hr' },
  ]

  return (
    <Glass dark={dark} className="px-7 py-5 text-center">
      <div
        className="text-[11px] uppercase tracking-[0.3em] mb-2"
        style={{ color: 'var(--text-3)' }}
      >
        Sober
      </div>
      <div className="flex gap-6 justify-center">
        {cells.map(({ v, l }) => (
          <div key={l}>
            <div
              className="text-4xl font-light tabular-nums leading-none"
              style={{ color: 'var(--sober-text)' }}
            >
              {v}
            </div>
            <div
              className="text-[10px] uppercase tracking-wider mt-1"
              style={{ color: 'var(--text-3)' }}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs mt-3" style={{ color: 'var(--text-2)' }}>
        {daysRemaining === 0
          ? `${next.label} — today 🎉`
          : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to ${next.label}`}
      </div>
    </Glass>
  )
}

function NowPlaying({ sessions, dark }: Pick<LayoutProps, 'sessions'> & { dark: boolean }) {
  if (sessions.length === 0) return null
  const s = sessions[0]
  return (
    <Glass dark={dark} className="px-4 py-2.5 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 pulse-dot" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent-2)' }}>
          Now Playing
        </div>
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {s.title}
          {s.subtitle && (
            <span className="font-light" style={{ color: 'var(--text-3)' }}>
              {' '}
              · {s.subtitle}
            </span>
          )}
        </div>
      </div>
    </Glass>
  )
}

function FlowCaption({ weatherData, piholeData }: Pick<LayoutProps, 'weatherData' | 'piholeData'>) {
  if (!weatherData) return null
  const { current } = weatherData
  const parts = [`WIND ${current.windDirection} ${current.windSpeed} MPH`, `${current.temp}°F`]
  if (piholeData) parts.push(`${piholeData.blockedPercentage.toFixed(0)}% BLOCKED`)
  return (
    <div
      className="text-[10px] uppercase tracking-[0.2em] text-center"
      style={{ color: 'var(--text-3)', textShadow: TEXT_SHADOW }}
    >
      Flow driven by · {parts.join(' · ')}
    </div>
  )
}

export function FluxLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  piholeData,
  sobrietyDate,
}: LayoutProps) {
  const dark = useIsDark()

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: dark ? '#06080f' : '#f1efe8' }}
    >
      <FluxField weather={weatherData} dark={dark} />

      <div className="absolute inset-0 z-10 flex flex-col p-6 gap-4">
        {/* Top: clock + weather */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4">
          <FluxClock />
          <div style={{ textShadow: TEXT_SHADOW }}>
            <WeatherHeader data={weatherData} loading={weatherLoading} />
          </div>
        </div>

        {/* Hero sober counter, vertically centered so the field breathes around it */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <SoberHero sobrietyDate={sobrietyDate} dark={dark} />
        </div>

        {/* Bottom: now playing, agenda, flow caption */}
        <div className="flex-shrink-0 flex flex-col gap-3">
          <NowPlaying sessions={sessions} dark={dark} />
          <Glass dark={dark} className="px-4 py-3">
            <div
              className="text-[10px] uppercase tracking-[0.2em] mb-2"
              style={{ color: 'var(--text-3)' }}
            >
              Next Up
            </div>
            <AgendaList events={events} loading={calendarLoading} maxItems={4} />
          </Glass>
          <FlowCaption weatherData={weatherData} piholeData={piholeData} />
        </div>
      </div>
    </div>
  )
}
