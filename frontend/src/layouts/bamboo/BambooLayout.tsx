import { useIsDark } from '../../hooks/useIsDark.js'
import { BambooField } from '../../components/BambooField.js'
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

export function BambooLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  sobrietyDate,
  wordOfDay,
}: LayoutProps) {
  const dark = useIsDark()

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: dark ? '#0a0a0f' : '#efeae0' }}
    >
      <BambooField weather={weatherData} dark={dark} />

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

        {/* Open center so the swaying field is the focus */}
        <div className="flex-1 min-h-0" />

        {/* Bottom: now playing, agenda */}
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
        </div>
      </div>
    </div>
  )
}
