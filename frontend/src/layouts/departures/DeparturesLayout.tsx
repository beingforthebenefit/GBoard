import { useEffect, useMemo, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { FlapClock } from '../../components/FlapClock.js'
import { SplitFlapBoard } from '../../components/SplitFlapBoard.js'
import { RadarTiles } from '../../components/RadarTiles.js'
import { WordOfDayWidget } from '../../components/WordOfDay.js'
import { PhotoBackground } from '../../components/PhotoBackground.js'
import { computeMilestoneProgress } from '../../utils/milestones.js'
import { buildBoardRows } from './boardRows.js'
import { LayoutProps, shouldShowRadar } from '../index.js'
import { PhotoInfo } from '../../types/index.js'

// ── Sections ──

/** Amber-duotone photo slideshow styled as an airport observation deck camera */
function ObservationDeck({ photos }: Pick<LayoutProps, 'photos'>) {
  const [photo, setPhoto] = useState<PhotoInfo | null>(null)

  const captionParts: string[] = []
  if (photo?.location?.city) {
    captionParts.push(
      photo.location.city + (photo.location.state ? `, ${photo.location.state}` : '')
    )
  }
  if (photo?.dateTaken) {
    captionParts.push(
      new Date(photo.dateTaken).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex-shrink-0 text-[10px] tracking-[0.25em] uppercase mb-1"
        style={{ color: 'rgba(231, 183, 95, 0.5)' }}
      >
        Observation Deck
      </div>
      <div className="flex-1 min-h-0 relative border border-amber-200/15 rounded-lg overflow-hidden bg-[#131315]">
        {photos.length === 0 ? (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs tracking-[0.2em]"
            style={{ color: 'rgba(231, 183, 95, 0.3)' }}
          >
            [ NO SIGNAL ]
          </div>
        ) : (
          <>
            <div className="absolute inset-0">
              <PhotoBackground
                photos={photos}
                renderCaption={() => null}
                onPhotoChange={setPhoto}
                className="rounded-lg"
              />
            </div>
            {captionParts.length > 0 && (
              <div
                className="absolute bottom-1.5 left-2.5 z-10 text-[10px] uppercase tracking-[0.1em] pointer-events-none bg-black/60 px-1.5 py-0.5 rounded-sm"
                style={{ color: 'rgba(231, 183, 95, 0.8)' }}
              >
                [{captionParts.join(' · ')}]
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ConditionsLine({
  weatherData: data,
  weatherLoading: loading,
}: Pick<LayoutProps, 'weatherData' | 'weatherLoading'>) {
  if (loading || !data) {
    return (
      <span className="text-xs" style={{ color: 'rgba(231, 183, 95, 0.4)' }}>
        FIELD CONDITIONS UNAVAILABLE
      </span>
    )
  }
  const { current, forecast } = data
  return (
    <div className="flex flex-col gap-1 text-xs font-mono">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="text-base" style={{ color: '#e7b75f' }}>
          {current.temp}°F
        </span>
        <span className="uppercase" style={{ color: 'rgba(231, 183, 95, 0.7)' }}>
          {current.description}
        </span>
        <span style={{ color: 'rgba(231, 183, 95, 0.5)' }}>
          WIND {current.windDirection} {current.windSpeed}MPH
          {current.windGust != null && ` G${Math.round(current.windGust)}`}
        </span>
        <span style={{ color: 'rgba(231, 183, 95, 0.5)' }}>VIS {current.visibility}MI</span>
        <span style={{ color: 'rgba(231, 183, 95, 0.5)' }}>HUM {current.humidity}%</span>
      </div>
      <div
        className="flex flex-wrap gap-x-3 gap-y-0.5"
        style={{ color: 'rgba(231, 183, 95, 0.5)' }}
      >
        {forecast.slice(1, 5).map((day) => (
          <span key={day.date}>
            {new Date(day.date + 'T12:00:00')
              .toLocaleDateString('en-US', { weekday: 'short' })
              .toUpperCase()}{' '}
            {day.high}/{day.low}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main layout ──

export function DeparturesLayout({
  weatherData,
  weatherLoading,
  events,
  sessions,
  piholeData,
  photos,
  mediaItems,
  radarData,
  radarMode,
  sobrietyDate,
  wordOfDay,
}: LayoutProps) {
  const now = useClock()
  const showRadar = shouldShowRadar(radarMode, radarData)
  // Minute resolution keeps row identity stable so the memoized board skips the
  // per-second clock re-render (statuses only need minute precision anyway)
  const minuteKey = Math.floor(now.getTime() / 60_000)
  const rows = useMemo(
    () => buildBoardRows(events, mediaItems, sessions, new Date(minuteKey * 60_000)).slice(0, 16),
    [events, mediaItems, sessions, minuteKey]
  )

  // Re-spin the whole board once a minute so the split-flap animation gets shown off
  const [sweepSeed, setSweepSeed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSweepSeed((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const { totalDays } = computeMilestoneProgress(new Date(sobrietyDate), now)
  const dateStr = now
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase()

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-[#0e0e10] font-mono p-5 gap-4">
      {/* Header */}
      <div className="flex-shrink-0 flex items-end justify-between gap-6 border-b border-amber-200/20 pb-3">
        <div>
          <div
            className="text-[11px] tracking-[0.4em] uppercase mb-1"
            style={{ color: 'rgba(231, 183, 95, 0.5)' }}
          >
            GBoard Intl · Departures
          </div>
          <FlapClock />
        </div>
        <div className="text-right">
          <div className="text-xs tracking-[0.2em]" style={{ color: 'rgba(231, 183, 95, 0.6)' }}>
            {dateStr}
          </div>
          <div className="text-sm tracking-[0.15em] mt-1" style={{ color: '#4ade80' }}>
            STREAK: DAY {totalDays.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Field conditions + Spanish word of the day, side by side */}
      <div className="flex-shrink-0 grid grid-cols-[3fr_2fr] gap-6 items-start">
        <ConditionsLine weatherData={weatherData} weatherLoading={weatherLoading} />
        {wordOfDay && (
          <WordOfDayWidget
            word={wordOfDay}
            compact
            label="PALABRA DEL DÍA"
            className="font-mono"
            style={{ color: '#e7b75f' }}
          />
        )}
      </div>

      {/* Board + optional radar, slideshow fills the rest */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="flex-shrink-0 flex gap-4 items-stretch">
          <div className="flex-1 min-w-0 bg-[#131315] border border-amber-200/15 rounded-lg p-4 overflow-hidden">
            <SplitFlapBoard rows={rows} minRows={16} sweepSeed={sweepSeed} />
          </div>
          {showRadar && radarData && (
            <div className="flex-shrink-0 w-64 flex flex-col">
              <div
                className="text-[10px] tracking-[0.25em] uppercase mb-1"
                style={{ color: 'rgba(231, 183, 95, 0.5)' }}
              >
                Precip Radar
              </div>
              <div className="flex-1 min-h-0 border border-amber-200/15 rounded-lg overflow-hidden">
                <RadarTiles data={radarData} fill />
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <ObservationDeck photos={photos} />
        </div>
      </div>

      {/* Security footer */}
      <div className="flex-shrink-0 flex items-center justify-between text-[11px] tracking-[0.1em] border-t border-amber-200/20 pt-2">
        {piholeData ? (
          <span style={{ color: 'rgba(231, 183, 95, 0.5)' }}>
            SECURITY SCREENING: {piholeData.totalQueries.toLocaleString()} PROCESSED ·{' '}
            {piholeData.blockedPercentage.toFixed(1)}% DENIED ·{' '}
            <span style={{ color: piholeData.status === 'enabled' ? '#4ade80' : '#f87171' }}>
              {piholeData.status === 'enabled' ? 'CHECKPOINT ACTIVE' : 'CHECKPOINT DOWN'}
            </span>
          </span>
        ) : (
          <span style={{ color: 'rgba(231, 183, 95, 0.3)' }}>SECURITY SCREENING OFFLINE</span>
        )}
        <span style={{ color: 'rgba(231, 183, 95, 0.35)' }}>ALL TIMES LOCAL</span>
      </div>
    </div>
  )
}
