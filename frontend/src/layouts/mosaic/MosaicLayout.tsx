import { useIsDark } from '../../hooks/useIsDark.js'
import { MosaicField } from '../../components/MosaicField.js'
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
import { computeMilestoneProgress } from '../../utils/milestones.js'
import { LayoutProps } from '../index.js'

function MosaicCaption({ piholeData }: Pick<LayoutProps, 'piholeData'>) {
  if (!piholeData) return null
  return (
    <div
      className="text-[10px] uppercase tracking-[0.2em] text-center"
      style={{ color: 'var(--text-3)', textShadow: TEXT_SHADOW }}
    >
      Ripples · {piholeData.totalQueries.toLocaleString()} queries ·{' '}
      {piholeData.blockedPercentage.toFixed(0)}% blocked
    </div>
  )
}

export function MosaicLayout({
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
  const { daysRemaining } = computeMilestoneProgress(new Date(sobrietyDate), new Date())
  // Tighten the shimmer as a milestone approaches (within two weeks)
  const shimmer = daysRemaining <= 14 ? 1 + (1 - daysRemaining / 14) * 0.6 : 1

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: dark ? '#06060b' : '#e9e3d6' }}
    >
      <MosaicField
        weather={weatherData}
        piholeData={piholeData}
        sessions={sessions}
        dark={dark}
        shimmer={shimmer}
      />

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

        {/* Open center so the tessellation is the focus */}
        <div className="flex-1 min-h-0" />

        {/* Bottom: now playing, agenda, pihole caption */}
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
          <MosaicCaption piholeData={piholeData} />
        </div>
      </div>
    </div>
  )
}
