import { PhotoBackground } from '../components/PhotoBackground.js'
import { PhotoCaption } from '../components/PhotoCaption.js'
import { WeatherHeader, ForecastStrip } from '../components/WeatherWidget.js'
import { ClockWidget } from '../components/ClockWidget.js'
import { SoberCounter } from '../components/SoberCounter.js'
import { MediaWidget } from '../components/MediaWidget.js'
import { PlexWidget } from '../components/PlexWidget.js'
import { CalendarGrid } from '../components/CalendarGrid.js'
import { PiholeWidget } from '../components/PiholeWidget.js'
import { RadarTiles } from '../components/RadarTiles.js'
import { LayoutProps, shouldShowRadar } from './index.js'
import { useState } from 'react'
import { PhotoInfo } from '../types/index.js'

export function ZenLayout({
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
  radarData,
  radarMode,
  sobrietyDate,
}: LayoutProps) {
  const showRadar = shouldShowRadar(radarMode, radarData)
  const [currentPhoto, setCurrentPhoto] = useState<PhotoInfo | null>(null)

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col p-5 gap-4">
      {/* Top bar: Clock left, Weather right */}
      <div className="flex-shrink-0 flex items-start justify-between gap-4">
        <ClockWidget />
        <WeatherHeader data={weatherData} loading={weatherLoading} />
      </div>

      {/* Forecast + sober/pihole — with radar on the right spanning both rows when shown */}
      {showRadar && radarData ? (
        <div className="flex-shrink-0 flex gap-3 items-stretch">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <ForecastStrip data={weatherData} loading={weatherLoading} maxDays={4} />
            <div className="flex gap-3 items-stretch">
              <SoberCounter sobrietyDate={sobrietyDate} className="flex-1" />
              <PiholeWidget data={piholeData} loading={piholeLoading} className="flex-1" />
            </div>
          </div>
          <div className="flex-shrink-0 w-64 card rounded-xl overflow-hidden">
            <RadarTiles data={radarData} fill />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-shrink-0">
            <ForecastStrip data={weatherData} loading={weatherLoading} />
          </div>
          <div className="flex-shrink-0 flex gap-3 items-stretch">
            <SoberCounter sobrietyDate={sobrietyDate} className="flex-1" />
            <PiholeWidget data={piholeData} loading={piholeLoading} className="flex-1" />
          </div>
        </>
      )}

      {/* Photo — takes all remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <PhotoBackground
            photos={photos}
            renderCaption={() => null}
            onPhotoChange={setCurrentPhoto}
          />
        </div>
        <PhotoCaption
          photo={currentPhoto}
          className="flex-shrink-0 text-xs font-light pt-1.5 px-1"
          style={{ color: 'var(--text-3)' }}
        />
      </div>

      {/* Plex now playing */}
      <div className="flex-shrink-0">
        <PlexWidget sessions={sessions} loading={plexLoading} />
      </div>

      {/* Upcoming + Calendar side by side */}
      <div className="flex-shrink-0 grid grid-cols-[2fr_1fr] gap-4">
        <CalendarGrid
          events={events}
          loading={calendarLoading}
          numDays={5}
          hourHeight={22}
          className="card rounded-xl px-4 py-2"
        />
        <MediaWidget
          items={mediaItems}
          loading={mediaLoading}
          className="card rounded-xl px-4 py-2"
        />
      </div>
    </div>
  )
}
