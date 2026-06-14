import { useIsDark } from '../../hooks/useIsDark.js'
import { FluxField } from '../../components/FluxField.js'
import { WeatherHeader } from '../../components/WeatherWidget.js'
import { AgendaList } from '../../components/AgendaList.js'
import { WordOfDayWidget } from '../../components/WordOfDay.js'
import {
  Glass,
  KineticClock,
  SoberChip,
  NowPlaying,
  TEXT_SHADOW,
} from '../../components/KineticOverlay.js'
import { LayoutProps } from '../index.js'

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
  wordOfDay,
}: LayoutProps) {
  const dark = useIsDark()

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: dark ? '#06080f' : '#f1efe8' }}
    >
      <FluxField weather={weatherData} dark={dark} />

      <div className="absolute inset-0 z-10 flex flex-col p-6 gap-4">
        {/* Top: clock + small sober line on the left, weather on the right */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4">
          <div>
            <KineticClock />
            <SoberChip sobrietyDate={sobrietyDate} />
          </div>
          <div style={{ textShadow: TEXT_SHADOW }}>
            <WeatherHeader data={weatherData} loading={weatherLoading} />
          </div>
        </div>

        {/* Open center so the flow field is the focus */}
        <div className="flex-1 min-h-0" />

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
          {wordOfDay && (
            <Glass dark={dark} className="px-4 py-3">
              <WordOfDayWidget word={wordOfDay} style={{ color: 'var(--text)' }} />
            </Glass>
          )}
          <FlowCaption weatherData={weatherData} piholeData={piholeData} />
        </div>
      </div>
    </div>
  )
}
